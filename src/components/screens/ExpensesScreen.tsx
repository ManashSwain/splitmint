import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
  Receipt,
  Trash2,
  Pencil,
  Sparkles,
} from 'lucide-react';
import {
  CategoryId,
  Expense,
  Settlement,
  Trip,
} from '../../types';
import { formatCents, formatShortDate } from '../../utils/currency';
import {
  computeCategoryBreakdown,
  computeMemberBalances,
  computeMinimumTransfers,
} from '../../utils/ledger';
import { CATEGORIES, CATEGORY_LIST, CategoryIconCircle } from '../CategoryBadge';
import { Avatar } from '../Avatar';

interface ExpensesScreenProps {
  trip: Trip;
  expenses: Expense[];
  settlements: Settlement[];
  onLogBill: () => void;
  onOpenReceiptCapture: () => void;
  onSelectExpense: (expense: Expense) => void;
  onDeleteSettlement: (settlementId: string) => void;
  onGoToSettle: () => void;
  onEditTrip: () => void;
}

export function ExpensesScreen({
  trip,
  expenses,
  settlements,
  onLogBill,
  onOpenReceiptCapture,
  onSelectExpense,
  onDeleteSettlement,
  onGoToSettle,
  onEditTrip,
}: ExpensesScreenProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | 'all'>('all');
  const [payerFilter, setPayerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest'>('newest');

  const balances = useMemo(
    () => computeMemberBalances(trip, expenses, settlements),
    [trip, expenses, settlements]
  );

  const transfers = useMemo(
    () => computeMinimumTransfers(balances),
    [balances]
  );

  const myBalanceRecord = balances.find(
    (b) => b.friend.id === trip.currentUserId
  );
  const myNetCents = myBalanceRecord?.netCents ?? 0;
  const myPaidCents = myBalanceRecord?.paidCents ?? 0;
  const myShareCents = myBalanceRecord?.shareCents ?? 0;

  const totalTripSpend = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amountCents, 0),
    [expenses]
  );

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(expenses),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses
      .filter((exp) => {
        if (categoryFilter !== 'all' && exp.category !== categoryFilter) {
          return false;
        }
        if (payerFilter !== 'all' && exp.paidById !== payerFilter) {
          return false;
        }
        if (q) {
          const payerName =
            trip.friends.find((f) => f.id === exp.paidById)?.name.toLowerCase() ??
            '';
          return (
            exp.title.toLowerCase().includes(q) ||
            payerName.includes(q) ||
            (exp.notes?.toLowerCase().includes(q) ?? false)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest') return b.amountCents - a.amountCents;
        if (a.date !== b.date) return b.date.localeCompare(a.date) * -1;
        return b.createdAt - a.createdAt;
      });
  }, [expenses, search, categoryFilter, payerFilter, sortBy, trip.friends]);

  const sortedSettlements = useMemo(() => {
    return [...settlements].sort((a, b) => b.createdAt - a.createdAt);
  }, [settlements]);

  const me = trip.friends.find((f) => f.id === trip.currentUserId);

  return (
    <div className="space-y-6">
      {/* Trip Sub-header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span>{trip.destination}</span>
            <span aria-hidden="true">·</span>
            <span>
              {formatShortDate(trip.startDate)} – {formatShortDate(trip.endDate)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{trip.friends.length} travelers</span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {trip.name}
            </h1>
            <button
              type="button"
              onClick={onEditTrip}
              className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              title="Edit trip & travelers"
              aria-label="Edit trip & travelers"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Friend Avatar Strip + Smart Receipt Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-2">
              {trip.friends.map((f) => (
                <div key={f.id} className="ring-2 ring-[#F8FAFC] rounded-full">
                  <Avatar
                    friend={f}
                    size="sm"
                    isMe={f.id === trip.currentUserId}
                  />
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-500 pl-1">
              Viewing as <strong className="text-slate-800">{me?.name}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenReceiptCapture}
            className="h-10 px-3.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 hover:text-[#059669] text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
            Smart Receipt
          </button>
        </div>
      </div>

      {/* 2-Column Desktop Layout (Summary Left, Transaction History Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Summary Ledger */}
        <div className="lg:col-span-5 space-y-5">
          {/* Primary Net Balance Card */}
          <div className="card-surface rounded-2xl p-6 space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your Net Position
              </span>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <p
                  className={`font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${
                    myNetCents > 0
                      ? 'text-[#059669]'
                      : myNetCents < 0
                        ? 'text-[#E11D48]'
                        : 'text-slate-900'
                  }`}
                >
                  {myNetCents === 0
                    ? formatCents(0, trip.currency)
                    : formatCents(Math.abs(myNetCents), trip.currency)}
                </p>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    myNetCents > 0
                      ? 'bg-emerald-50 text-[#059669]'
                      : myNetCents < 0
                        ? 'bg-rose-50 text-[#E11D48]'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {myNetCents > 0
                    ? 'You are owed'
                    : myNetCents < 0
                      ? 'You owe'
                      : 'Settled up'}
                </span>
              </div>
            </div>

            {/* 3-Metric Strip */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div>
                <span className="text-xs text-slate-500 block">Trip Total</span>
                <span className="font-display text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                  {formatCents(totalTripSpend, trip.currency)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">You Paid</span>
                <span className="font-display text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                  {formatCents(myPaidCents, trip.currency)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Your Share</span>
                <span className="font-display text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                  {formatCents(myShareCents, trip.currency)}
                </span>
              </div>
            </div>

            {/* Quick Settle Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {transfers.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#059669]">
                    <CheckCircle2 className="w-4 h-4" />
                    All group debts are settled
                  </span>
                ) : (
                  <span>
                    <strong className="text-slate-900">{transfers.length}</strong>{' '}
                    {transfers.length === 1 ? 'payment' : 'payments'} settle all
                    balances
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onGoToSettle}
                className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                Settle Up
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Category Breakdown Card */}
          <div className="card-surface rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                Spending by Category
              </h2>
              {categoryFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="text-xs font-semibold text-[#059669] hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">
                Category totals will appear once you log your first shared bill.
              </p>
            ) : (
              <>
                {/* Stacked proportional bar */}
                <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100">
                  {categoryBreakdown.map((item) => {
                    const cfg = CATEGORIES[item.category];
                    return (
                      <div
                        key={item.category}
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: cfg.barColor,
                        }}
                        title={`${cfg.label}: ${Math.round(item.percent)}%`}
                      />
                    );
                  })}
                </div>

                <div className="space-y-1.5">
                  {categoryBreakdown.map((item) => {
                    const cfg = CATEGORIES[item.category];
                    const active = categoryFilter === item.category;
                    return (
                      <button
                        key={item.category}
                        type="button"
                        onClick={() =>
                          setCategoryFilter(active ? 'all' : item.category)
                        }
                        className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-left transition-colors ${
                          active
                            ? 'bg-emerald-50/80 ring-1 ring-[#10B981]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cfg.barColor }}
                          />
                          <span className="text-sm font-medium text-slate-800">
                            {cfg.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {item.count} {item.count === 1 ? 'bill' : 'bills'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 tabular-nums">
                          <span className="text-xs text-slate-500">
                            {Math.round(item.percent)}%
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {formatCents(item.totalCents, trip.currency)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Transaction History & Filters */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Filters Toolbar */}
          <div className="card-surface rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search bills, notes, or friend..."
                  aria-label="Search bills"
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={payerFilter}
                  onChange={(e) => setPayerFilter(e.target.value)}
                  aria-label="Filter by payer"
                  className="h-11 px-3 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-[#10B981]"
                >
                  <option value="all">All payers</option>
                  {trip.friends.map((f) => (
                    <option key={f.id} value={f.id}>
                      Paid by {f.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setSortBy((prev) =>
                      prev === 'newest' ? 'highest' : 'newest'
                    )
                  }
                  className="h-11 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-medium text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  {sortBy === 'newest' ? 'Newest' : 'Highest'}
                </button>
              </div>
            </div>

            {/* Interactive Category Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({expenses.length})
              </button>
              {CATEGORY_LIST.map((cat) => {
                const count = expenses.filter((e) => e.category === cat.id).length;
                if (count === 0) return null;
                const active = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setCategoryFilter(active ? 'all' : cat.id)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#10B981] text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expense Rows */}
          {filteredExpenses.length === 0 ? (
            <div className="card-surface rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-900">
                  {expenses.length === 0
                    ? 'No shared bills yet'
                    : 'No bills match your filters'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {expenses.length === 0
                    ? 'Log your first dinner, stay, or transit ticket to start splitting.'
                    : 'Try clearing your search or category filter.'}
                </p>
              </div>
              {expenses.length === 0 ? (
                <button
                  type="button"
                  onClick={onLogBill}
                  className="h-11 px-5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold inline-flex items-center gap-2 btn-primary-glow transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Log First Bill
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('all');
                    setPayerFilter('all');
                  }}
                  className="h-10 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredExpenses.map((expense) => {
                const payer = trip.friends.find(
                  (f) => f.id === expense.paidById
                );
                const catCfg = CATEGORIES[expense.category] ?? CATEGORIES.other;
                const participantCount = Object.values(expense.splits).filter(
                  (v) => v > 0
                ).length;
                const myShare = expense.splits[trip.currentUserId] ?? 0;
                const iPaid = expense.paidById === trip.currentUserId;
                const myLent = iPaid ? expense.amountCents - myShare : 0;

                return (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => onSelectExpense(expense)}
                    className="w-full card-surface hover:border-slate-300 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3.5 text-left transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <CategoryIconCircle category={expense.category} size="md" />
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-sm sm:text-base text-slate-900 truncate">
                          {expense.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Paid by {iPaid ? 'You' : payer?.name ?? 'Unknown'}
                          <span aria-hidden="true"> · </span>
                          {formatShortDate(expense.date)}
                          <span aria-hidden="true"> · </span>
                          {catCfg.label}
                          <span aria-hidden="true"> · </span>
                          {expense.splitMode === 'equal'
                            ? `Split ${participantCount} ways`
                            : 'Custom split'}
                          {expense.originalCurrency &&
                            expense.originalCurrency !== trip.currency &&
                            expense.originalAmountCents !== undefined && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="text-slate-600 font-medium tabular-nums">
                                  {formatCents(
                                    expense.originalAmountCents,
                                    expense.originalCurrency
                                  )}{' '}
                                  {expense.originalCurrency}
                                </span>
                              </>
                            )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <p className="font-display font-bold text-sm sm:text-base text-slate-900">
                        {formatCents(expense.amountCents, trip.currency)}
                      </p>
                      {iPaid ? (
                        <p className="text-xs font-semibold text-[#059669]">
                          You lent {formatCents(myLent, trip.currency)}
                        </p>
                      ) : myShare > 0 ? (
                        <p className="text-xs font-semibold text-[#E11D48]">
                          Your share {formatCents(myShare, trip.currency)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">Not involved</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Recorded Settlements Feed */}
          {sortedSettlements.length > 0 && (
            <div className="pt-3 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Recorded Payments ({sortedSettlements.length})
              </h3>
              {sortedSettlements.map((stl) => {
                const from = trip.friends.find((f) => f.id === stl.fromId);
                const to = trip.friends.find((f) => f.id === stl.toId);
                return (
                  <div
                    key={stl.id}
                    className="rounded-xl bg-emerald-50/50 border border-emerald-200/80 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {from?.name ?? 'Unknown'} paid {to?.name ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {formatShortDate(stl.date)}
                          {stl.note ? ` · ${stl.note}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-display font-bold text-sm text-[#059669] tabular-nums">
                        {formatCents(stl.amountCents, trip.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteSettlement(stl.id)}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove recorded payment"
                        aria-label="Remove recorded payment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
