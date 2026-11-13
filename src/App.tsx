import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Plus,
  Compass,
  Receipt,
  Scale,
  ArrowLeftRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  AppScreen,
  Expense,
  Settlement,
  SplitMintStore,
  SuggestedTransfer,
  Trip,
} from './types';
import { createInitialStore, loadStore, saveStore } from './data/seed';
import {
  convertMinorUnits,
  getDefaultExchangeRate,
} from './utils/currency';
import {
  computeMemberBalances,
  computeMinimumTransfers,
  computeProportionalSplits,
} from './utils/ledger';
import { TripsScreen } from './components/screens/TripsScreen';
import { ExpensesScreen } from './components/screens/ExpensesScreen';
import { BalancesScreen } from './components/screens/BalancesScreen';
import { SettleUpScreen } from './components/screens/SettleUpScreen';
import { TripModal } from './components/TripModal';
import { ExpenseModal } from './components/ExpenseModal';
import { ExpenseDetailDrawer } from './components/ExpenseDetailDrawer';
import { SettleModal } from './components/SettleModal';
import { ReceiptCaptureModal } from './components/ReceiptCaptureModal';

export default function App() {
  const [store, setStore] = useState<SplitMintStore>(() => loadStore());
  const [screen, setScreen] = useState<AppScreen>('expenses');

  // Modals & Drawers
  const [tripModalState, setTripModalState] = useState<{
    open: boolean;
    trip?: Trip | null;
  }>({ open: false, trip: null });

  const [expenseModalState, setExpenseModalState] = useState<{
    open: boolean;
    expense?: Expense | null;
  }>({ open: false, expense: null });

  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);

  const [settleModalState, setSettleModalState] = useState<{
    open: boolean;
    fromId?: string;
    toId?: string;
    amountCents?: number;
  }>({ open: false });

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const [tripMenuOpen, setTripMenuOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    undoSettlementIds?: string[];
  } | null>(null);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const showToast = (message: string, undoSettlementIds?: string[]) => {
    const payload = { message, undoSettlementIds };
    setToast(payload);
    window.setTimeout(() => {
      setToast((prev) =>
        prev?.message === message &&
        prev?.undoSettlementIds === undoSettlementIds
          ? null
          : prev
      );
    }, undoSettlementIds ? 4500 : 2600);
  };

  const activeTrip = useMemo(() => {
    return (
      store.trips.find((t) => t.id === store.activeTripId) ?? store.trips[0]
    );
  }, [store.trips, store.activeTripId]);

  const activeExpenses = useMemo(
    () =>
      activeTrip
        ? store.expenses.filter((e) => e.tripId === activeTrip.id)
        : [],
    [store.expenses, activeTrip]
  );

  const activeSettlements = useMemo(
    () =>
      activeTrip
        ? store.settlements.filter((s) => s.tripId === activeTrip.id)
        : [],
    [store.settlements, activeTrip]
  );

  // Determine which friends in the edited trip are referenced by bills/settlements
  const lockedFriendIdsForModal = useMemo(() => {
    const target = tripModalState.trip;
    if (!target) return new Set<string>();
    const locked = new Set<string>();
    for (const exp of store.expenses) {
      if (exp.tripId !== target.id) continue;
      locked.add(exp.paidById);
      for (const [fid, val] of Object.entries(exp.splits)) {
        if (val > 0) locked.add(fid);
      }
    }
    for (const stl of store.settlements) {
      if (stl.tripId !== target.id) continue;
      locked.add(stl.fromId);
      locked.add(stl.toId);
    }
    return locked;
  }, [tripModalState.trip, store.expenses, store.settlements]);

  // Handlers
  const handleSaveTrip = (
    savedTrip: Trip,
    convertExistingToNewCurrency?: boolean
  ) => {
    setStore((prev) => {
      const oldTrip = prev.trips.find((t) => t.id === savedTrip.id);
      const exists = Boolean(oldTrip);
      const trips = exists
        ? prev.trips.map((t) => (t.id === savedTrip.id ? savedTrip : t))
        : [savedTrip, ...prev.trips];

      let nextExpenses = prev.expenses;
      let nextSettlements = prev.settlements;

      if (
        oldTrip &&
        convertExistingToNewCurrency &&
        oldTrip.currency !== savedTrip.currency
      ) {
        const rate = getDefaultExchangeRate(
          oldTrip.currency,
          savedTrip.currency
        );
        nextExpenses = prev.expenses.map((exp) => {
          if (exp.tripId !== savedTrip.id) return exp;
          const origCurrency = exp.originalCurrency ?? oldTrip.currency;
          const origAmountCents = exp.originalAmountCents ?? exp.amountCents;
          const newRate =
            origCurrency === savedTrip.currency
              ? 1
              : getDefaultExchangeRate(origCurrency, savedTrip.currency);
          const newAmountCents =
            origCurrency === savedTrip.currency
              ? origAmountCents
              : convertMinorUnits(
                  exp.amountCents,
                  oldTrip.currency,
                  savedTrip.currency,
                  rate
                );
          const newSplits = computeProportionalSplits(
            newAmountCents,
            exp.splits
          );
          return {
            ...exp,
            amountCents: newAmountCents,
            splits: newSplits,
            originalCurrency:
              origCurrency === savedTrip.currency ? undefined : origCurrency,
            originalAmountCents:
              origCurrency === savedTrip.currency ? undefined : origAmountCents,
            exchangeRate:
              origCurrency === savedTrip.currency ? undefined : newRate,
          };
        });

        nextSettlements = prev.settlements.map((stl) => {
          if (stl.tripId !== savedTrip.id) return stl;
          return {
            ...stl,
            amountCents: convertMinorUnits(
              stl.amountCents,
              oldTrip.currency,
              savedTrip.currency,
              rate
            ),
          };
        });
      }

      return {
        ...prev,
        trips,
        expenses: nextExpenses,
        settlements: nextSettlements,
        activeTripId: savedTrip.id,
      };
    });
    setTripModalState({ open: false, trip: null });
    if (!tripModalState.trip) {
      setScreen('expenses');
      showToast(`Created "${savedTrip.name}"`);
    } else {
      showToast(`Updated "${savedTrip.name}"`);
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    setStore((prev) => {
      const remaining = prev.trips.filter((t) => t.id !== tripId);
      if (remaining.length === 0) {
        const fresh = createInitialStore();
        return fresh;
      }
      const nextActive =
        prev.activeTripId === tripId ? remaining[0].id : prev.activeTripId;
      return {
        trips: remaining,
        expenses: prev.expenses.filter((e) => e.tripId !== tripId),
        settlements: prev.settlements.filter((s) => s.tripId !== tripId),
        activeTripId: nextActive,
      };
    });
    setTripModalState({ open: false, trip: null });
    setScreen('trips');
    showToast('Trip removed');
  };

  const handleSaveExpense = (savedExpense: Expense) => {
    setStore((prev) => {
      const exists = prev.expenses.some((e) => e.id === savedExpense.id);
      const expenses = exists
        ? prev.expenses.map((e) =>
            e.id === savedExpense.id ? savedExpense : e
          )
        : [savedExpense, ...prev.expenses];
      return { ...prev, expenses };
    });
    setExpenseModalState({ open: false, expense: null });
    setDetailExpense(null);
    showToast(expenseModalState.expense ? 'Bill updated' : 'Shared bill logged');
  };

  const handleDeleteExpense = (expenseId: string) => {
    setStore((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
    setDetailExpense(null);
    showToast('Bill deleted');
  };

  const handleSaveSettlement = (stl: Settlement) => {
    setStore((prev) => ({
      ...prev,
      settlements: [stl, ...prev.settlements],
    }));
    setSettleModalState({ open: false });
    showToast('Payment recorded');
  };

  const handleDeleteSettlement = (settlementId: string) => {
    setStore((prev) => ({
      ...prev,
      settlements: prev.settlements.filter((s) => s.id !== settlementId),
    }));
    showToast('Payment removed');
  };

  const handleResetDemo = () => {
    const fresh = createInitialStore();
    setStore(fresh);
    showToast('Demo trips restored');
  };

  const handleOneTapSettleTransfer = (transfer: SuggestedTransfer) => {
    if (!activeTrip) return;
    const id = `stl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newStl: Settlement = {
      id,
      tripId: activeTrip.id,
      fromId: transfer.fromId,
      toId: transfer.toId,
      amountCents: transfer.amountCents,
      date: new Date().toISOString().slice(0, 10),
      note: 'Marked settled',
      createdAt: Date.now(),
    };
    setStore((prev) => ({
      ...prev,
      settlements: [newStl, ...prev.settlements],
    }));
    const fromName =
      activeTrip.friends.find((f) => f.id === transfer.fromId)?.name ?? '';
    const toName =
      activeTrip.friends.find((f) => f.id === transfer.toId)?.name ?? '';
    showToast(`Marked ${fromName} → ${toName} settled`, [id]);
  };

  const handleOneTapSettlePerson = (friendId: string) => {
    if (!activeTrip) return;
    const balances = computeMemberBalances(
      activeTrip,
      activeExpenses,
      activeSettlements
    );
    const transfers = computeMinimumTransfers(balances);
    const targetBalance = balances.find((b) => b.friend.id === friendId);
    if (!targetBalance || targetBalance.netCents === 0) return;

    const matching = transfers.filter((t) =>
      targetBalance.netCents < 0 ? t.fromId === friendId : t.toId === friendId
    );
    if (matching.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const newSettlements: Settlement[] = matching.map((t, idx) => ({
      id: `stl_${now}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      tripId: activeTrip.id,
      fromId: t.fromId,
      toId: t.toId,
      amountCents: t.amountCents,
      date: today,
      note: `Marked ${targetBalance.friend.name} settled`,
      createdAt: now + idx,
    }));

    setStore((prev) => ({
      ...prev,
      settlements: [...newSettlements, ...prev.settlements],
    }));
    showToast(
      `Marked ${targetBalance.friend.name} as settled`,
      newSettlements.map((s) => s.id)
    );
  };

  const handleMarkAllSettled = () => {
    if (!activeTrip) return;
    const balances = computeMemberBalances(
      activeTrip,
      activeExpenses,
      activeSettlements
    );
    const transfers = computeMinimumTransfers(balances);
    if (transfers.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const newSettlements: Settlement[] = transfers.map((t, idx) => ({
      id: `stl_${now}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      tripId: activeTrip.id,
      fromId: t.fromId,
      toId: t.toId,
      amountCents: t.amountCents,
      date: today,
      note: 'Settled all balances',
      createdAt: now + idx,
    }));

    setStore((prev) => ({
      ...prev,
      settlements: [...newSettlements, ...prev.settlements],
    }));
    showToast(
      'All trip balances marked settled',
      newSettlements.map((s) => s.id)
    );
  };

  const handleUndoSettlements = (ids: string[]) => {
    const idSet = new Set(ids);
    setStore((prev) => ({
      ...prev,
      settlements: prev.settlements.filter((s) => !idSet.has(s.id)),
    }));
    setToast(null);
  };

  const handleQuickSettlePerson = (friendId: string, netCents: number) => {
    if (!activeTrip) return;
    if (netCents < 0) {
      // Friend owes the group; default to paying "You" if not self
      const targetId =
        friendId !== activeTrip.currentUserId
          ? activeTrip.currentUserId
          : activeTrip.friends.find((f) => f.id !== friendId)?.id;
      setSettleModalState({
        open: true,
        fromId: friendId,
        toId: targetId,
        amountCents: Math.abs(netCents),
      });
    } else if (netCents > 0) {
      const fromId =
        friendId !== activeTrip.currentUserId
          ? activeTrip.currentUserId
          : activeTrip.friends.find((f) => f.id !== friendId)?.id;
      setSettleModalState({
        open: true,
        fromId,
        toId: friendId,
        amountCents: netCents,
      });
    }
  };

  const navItems: {
    id: AppScreen;
    label: string;
    icon: ComponentType<{ className?: string }>;
  }[] = [
    { id: 'trips', label: 'Trips', icon: Compass },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'balances', label: 'Balances', icon: Scale },
    { id: 'settle', label: 'Settle Up', icon: ArrowLeftRight },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* TOP NAVIGATION BAR (3-Zone Contract) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setScreen('expenses')}
            className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] rounded-md"
          >
            <span className="w-7 h-7 rounded-lg bg-[#10B981] text-white inline-flex items-center justify-center text-sm font-extrabold">
              S
            </span>
            SplitMint
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            className="hidden md:flex items-center gap-6"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => {
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScreen(item.id)}
                  className={`py-2 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'border-[#10B981] text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            {screen === 'trips' ? (
              <button
                type="button"
                onClick={() => setTripModalState({ open: true, trip: null })}
                className="h-10 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 btn-primary-glow transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                New Trip
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setExpenseModalState({ open: true, expense: null })
                }
                disabled={!activeTrip}
                className="h-10 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 btn-primary-glow transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Log Bill
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Workspace Trip Context Switcher (on non-Trips screens) */}
      {screen !== 'trips' && activeTrip && (
        <div className="border-b border-slate-200/80 bg-white/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setTripMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 py-1.5 px-2 -ml-2 rounded-md hover:bg-slate-100 transition-colors"
                aria-expanded={tripMenuOpen}
              >
                <span className="text-slate-400 font-medium">Trip:</span>
                <span className="truncate max-w-[200px] sm:max-w-xs text-slate-900">
                  {activeTrip.name}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {tripMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setTripMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white border border-slate-200 shadow-xl z-40 py-1.5">
                    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Active Trip
                    </div>
                    {store.trips.map((t) => {
                      const isSelected = t.id === activeTrip.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setStore((prev) => ({
                              ...prev,
                              activeTripId: t.id,
                            }));
                            setTripMenuOpen(false);
                          }}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {t.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {t.friends.length} friends · {t.currency}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                    <div className="mt-1 pt-1 border-t border-slate-100 px-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTripMenuOpen(false);
                          setTripModalState({ open: true, trip: null });
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold text-[#059669] hover:bg-emerald-50 flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create New Trip
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setScreen('trips')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 whitespace-nowrap"
            >
              All Trips ({store.trips.length})
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-10">
        {screen === 'trips' && (
          <TripsScreen
            trips={store.trips}
            activeTripId={activeTrip?.id ?? ''}
            expenses={store.expenses}
            settlements={store.settlements}
            onSelectTrip={(tripId) => {
              setStore((prev) => ({ ...prev, activeTripId: tripId }));
              setScreen('expenses');
            }}
            onCreateTrip={() => setTripModalState({ open: true, trip: null })}
            onEditTrip={(trip) => setTripModalState({ open: true, trip })}
            onResetDemo={handleResetDemo}
          />
        )}

        {screen === 'expenses' && activeTrip && (
          <ExpensesScreen
            trip={activeTrip}
            expenses={activeExpenses}
            settlements={activeSettlements}
            onLogBill={() =>
              setExpenseModalState({ open: true, expense: null })
            }
            onOpenReceiptCapture={() => setReceiptModalOpen(true)}
            onSelectExpense={(exp) => setDetailExpense(exp)}
            onDeleteSettlement={handleDeleteSettlement}
            onGoToSettle={() => setScreen('settle')}
            onEditTrip={() =>
              setTripModalState({ open: true, trip: activeTrip })
            }
          />
        )}

        {screen === 'balances' && activeTrip && (
          <BalancesScreen
            trip={activeTrip}
            expenses={activeExpenses}
            settlements={activeSettlements}
            onGoToSettle={() => setScreen('settle')}
            onQuickSettlePerson={handleQuickSettlePerson}
            onOneTapSettlePerson={handleOneTapSettlePerson}
          />
        )}

        {screen === 'settle' && activeTrip && (
          <SettleUpScreen
            trip={activeTrip}
            expenses={activeExpenses}
            settlements={activeSettlements}
            onRecordSuggested={(t: SuggestedTransfer) =>
              setSettleModalState({
                open: true,
                fromId: t.fromId,
                toId: t.toId,
                amountCents: t.amountCents,
              })
            }
            onOneTapSettleTransfer={handleOneTapSettleTransfer}
            onMarkAllSettled={handleMarkAllSettled}
            onRecordCustom={() => setSettleModalState({ open: true })}
            onDeleteSettlement={handleDeleteSettlement}
          />
        )}
      </main>

      {/* MOBILE BOTTOM TAB BAR (<768px, compact height <= 15% cap) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 h-16"
        aria-label="Mobile navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setScreen(item.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                active ? 'text-[#059669]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* MODALS & DRAWERS */}
      {tripModalState.open && (
        <TripModal
          existingTrip={tripModalState.trip}
          lockedFriendIds={lockedFriendIdsForModal}
          hasExistingActivity={
            Boolean(tripModalState.trip) &&
            (store.expenses.some((e) => e.tripId === tripModalState.trip?.id) ||
              store.settlements.some(
                (s) => s.tripId === tripModalState.trip?.id
              ))
          }
          onSave={handleSaveTrip}
          onDelete={handleDeleteTrip}
          onClose={() => setTripModalState({ open: false, trip: null })}
        />
      )}

      {expenseModalState.open && activeTrip && (
        <ExpenseModal
          trip={activeTrip}
          existingExpense={expenseModalState.expense}
          onSave={handleSaveExpense}
          onSwitchToReceiptCapture={() => {
            setExpenseModalState({ open: false, expense: null });
            setReceiptModalOpen(true);
          }}
          onClose={() => setExpenseModalState({ open: false, expense: null })}
        />
      )}

      {receiptModalOpen && activeTrip && (
        <ReceiptCaptureModal
          trip={activeTrip}
          onSave={(saved) => {
            handleSaveExpense(saved);
            setReceiptModalOpen(false);
            showToast('Itemized receipt saved');
          }}
          onClose={() => setReceiptModalOpen(false)}
        />
      )}

      {detailExpense && activeTrip && (
        <ExpenseDetailDrawer
          expense={detailExpense}
          trip={activeTrip}
          onEdit={() => {
            const target = detailExpense;
            setDetailExpense(null);
            setExpenseModalState({ open: true, expense: target });
          }}
          onDelete={handleDeleteExpense}
          onClose={() => setDetailExpense(null)}
        />
      )}

      {settleModalState.open && activeTrip && (
        <SettleModal
          tripId={activeTrip.id}
          currency={activeTrip.currency}
          friends={activeTrip.friends}
          initialFromId={settleModalState.fromId}
          initialToId={settleModalState.toId}
          initialAmountCents={settleModalState.amountCents}
          onSave={handleSaveSettlement}
          onClose={() => setSettleModalState({ open: false })}
        />
      )}

      {/* Subtle Action Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-lg flex items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#4edea3]" />
            <span>{toast.message}</span>
          </div>
          {toast.undoSettlementIds && toast.undoSettlementIds.length > 0 && (
            <button
              type="button"
              onClick={() => handleUndoSettlements(toast.undoSettlementIds!)}
              className="text-xs font-bold text-[#4edea3] hover:text-white underline underline-offset-2"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
