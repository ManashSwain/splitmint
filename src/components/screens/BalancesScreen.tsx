import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Expense, Settlement, Trip } from '../../types';
import { formatCents } from '../../utils/currency';
import { computeMemberBalances } from '../../utils/ledger';
import { Avatar } from '../Avatar';

interface BalancesScreenProps {
  trip: Trip;
  expenses: Expense[];
  settlements: Settlement[];
  onGoToSettle: () => void;
  onQuickSettlePerson: (friendId: string, netCents: number) => void;
  onOneTapSettlePerson: (friendId: string) => void;
}

export function BalancesScreen({
  trip,
  expenses,
  settlements,
  onGoToSettle,
  onQuickSettlePerson,
  onOneTapSettlePerson,
}: BalancesScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    trip.currentUserId
  );

  const balances = useMemo(() => {
    const list = computeMemberBalances(trip, expenses, settlements);
    return [...list].sort((a, b) => b.netCents - a.netCents);
  }, [trip, expenses, settlements]);

  const maxAbsNet = useMemo(() => {
    const max = Math.max(...balances.map((b) => Math.abs(b.netCents)), 1);
    return max;
  }, [balances]);

  const totalTripSpend = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amountCents, 0),
    [expenses]
  );

  const unsettledCount = balances.filter((b) => b.netCents !== 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {trip.name} · {trip.friends.length} travelers
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-0.5">
            Live Balances
          </h1>
        </div>

        <button
          type="button"
          onClick={onGoToSettle}
          className="h-11 px-5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold inline-flex items-center gap-2 btn-primary-glow transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          View Fewest Payments
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Diverging Balance Overview Chart + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Diverging Net Position Bars */}
        <div className="lg:col-span-5 card-surface rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Net Standing
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Green gets money back · Rose owes the group
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              Total {formatCents(totalTripSpend, trip.currency)}
            </span>
          </div>

          <div className="space-y-3.5">
            {balances.map((b) => {
              const pct = Math.min(
                100,
                Math.round((Math.abs(b.netCents) / maxAbsNet) * 100)
              );
              const isCreditor = b.netCents > 0;
              const isDebtor = b.netCents < 0;
              const isMe = b.friend.id === trip.currentUserId;

              return (
                <div key={b.friend.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar friend={b.friend} size="xs" isMe={isMe} />
                      <span className="font-semibold text-slate-900 truncate">
                        {b.friend.name}
                        {isMe ? ' (You)' : ''}
                      </span>
                    </div>
                    <span
                      className={`font-display font-bold tabular-nums inline-flex items-center gap-1 ${
                        isCreditor
                          ? 'text-[#059669]'
                          : isDebtor
                            ? 'text-[#E11D48]'
                            : 'text-[#059669]'
                      }`}
                    >
                      {b.netCents === 0 ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled</span>
                        </>
                      ) : (
                        formatCents(b.netCents, trip.currency, {
                          showSign: true,
                        })
                      )}
                    </span>
                  </div>

                  {/* Diverging Center Axis Bar */}
                  <div className="grid grid-cols-2 items-center h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                    <div className="flex justify-end pr-[1px]">
                      {isDebtor && (
                        <div
                          className="h-2.5 rounded-l-full bg-[#F43F5E]"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                    <div className="flex justify-start pl-[1px] border-l border-slate-300">
                      {isCreditor && (
                        <div
                          className="h-2.5 rounded-r-full bg-[#10B981]"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {unsettledCount === 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
              <span>Everyone in this trip is completely settled up.</span>
            </div>
          )}
        </div>

        {/* Right: Detailed Per-Person Audit Accordion */}
        <div className="lg:col-span-7 space-y-3">
          {balances.map((b) => {
            const isExpanded = expandedId === b.friend.id;
            const isMe = b.friend.id === trip.currentUserId;
            const isCreditor = b.netCents > 0;
            const isDebtor = b.netCents < 0;

            const paidBills = expenses.filter(
              (e) => e.paidById === b.friend.id
            );
            const sharedBills = expenses.filter(
              (e) => (e.splits[b.friend.id] ?? 0) > 0
            );

            return (
              <div
                key={b.friend.id}
                className="card-surface rounded-2xl overflow-hidden"
              >
                <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : b.friend.id)
                    }
                    className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left rounded-xl py-1 -mx-1 px-1 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar friend={b.friend} size="md" isMe={isMe} />
                      <div className="min-w-0">
                        <p className="font-display font-bold text-base text-slate-900 truncate">
                          {b.friend.name}
                          {isMe ? ' (You)' : ''}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 tabular-nums truncate">
                          Paid {formatCents(b.paidCents, trip.currency)}
                          <span aria-hidden="true"> · </span>
                          Share {formatCents(b.shareCents, trip.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right tabular-nums">
                        <p
                          className={`font-display text-base sm:text-lg font-bold ${
                            isCreditor
                              ? 'text-[#059669]'
                              : isDebtor
                                ? 'text-[#E11D48]'
                                : 'text-[#059669]'
                          }`}
                        >
                          {b.netCents === 0
                            ? formatCents(0, trip.currency)
                            : formatCents(b.netCents, trip.currency, {
                                showSign: true,
                              })}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {isCreditor
                            ? 'Gets back'
                            : isDebtor
                              ? 'Owes group'
                              : 'Settled'}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {b.netCents !== 0 ? (
                    <button
                      type="button"
                      onClick={() => onOneTapSettlePerson(b.friend.id)}
                      className="h-9 px-3 rounded-lg bg-emerald-50 hover:bg-[#10B981] border border-emerald-200 hover:border-[#10B981] text-[#059669] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      title={`Mark ${b.friend.name} as settled`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settled</span>
                    </button>
                  ) : (
                    <span className="h-9 px-3 rounded-lg bg-emerald-50/70 text-[#059669] text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Settled</span>
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/40 space-y-4">
                    {/* Breakdown Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                        <span className="text-slate-500 block">Bills Paid</span>
                        <span className="font-display font-bold text-sm text-slate-900 tabular-nums">
                          {formatCents(b.paidCents, trip.currency)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                        <span className="text-slate-500 block">Fair Share</span>
                        <span className="font-display font-bold text-sm text-slate-900 tabular-nums">
                          {formatCents(b.shareCents, trip.currency)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                        <span className="text-slate-500 block">Repaid Out</span>
                        <span className="font-display font-bold text-sm text-slate-900 tabular-nums">
                          {formatCents(b.settledOutCents, trip.currency)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                        <span className="text-slate-500 block">Received</span>
                        <span className="font-display font-bold text-sm text-slate-900 tabular-nums">
                          {formatCents(b.settledInCents, trip.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Participated Bills List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-700 mb-1.5">
                          Fronted Bills ({paidBills.length})
                        </p>
                        {paidBills.length === 0 ? (
                          <p className="text-slate-400">None yet</p>
                        ) : (
                          <ul className="space-y-1">
                            {paidBills.map((e) => (
                              <li
                                key={e.id}
                                className="flex items-center justify-between gap-2 text-slate-600"
                              >
                                <span className="truncate">{e.title}</span>
                                <span className="font-semibold tabular-nums text-slate-900 shrink-0">
                                  {formatCents(e.amountCents, trip.currency)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-700 mb-1.5">
                          Shares Consumed ({sharedBills.length})
                        </p>
                        {sharedBills.length === 0 ? (
                          <p className="text-slate-400">None yet</p>
                        ) : (
                          <ul className="space-y-1">
                            {sharedBills.map((e) => (
                              <li
                                key={e.id}
                                className="flex items-center justify-between gap-2 text-slate-600"
                              >
                                <span className="truncate">{e.title}</span>
                                <span className="font-semibold tabular-nums text-slate-900 shrink-0">
                                  {formatCents(
                                    e.splits[b.friend.id] ?? 0,
                                    trip.currency
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {b.netCents !== 0 && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            onQuickSettlePerson(b.friend.id, b.netCents)
                          }
                          className="h-9 px-3.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors"
                        >
                          {b.netCents < 0
                            ? `Record payment from ${b.friend.name}`
                            : `Record payment to ${b.friend.name}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
