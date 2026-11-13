import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Expense, Settlement, SuggestedTransfer, Trip } from '../../types';
import { formatCents, formatShortDate } from '../../utils/currency';
import {
  computeMemberBalances,
  computeMinimumTransfers,
  countUnsimplifiedEdges,
} from '../../utils/ledger';
import { Avatar } from '../Avatar';

interface SettleUpScreenProps {
  trip: Trip;
  expenses: Expense[];
  settlements: Settlement[];
  onRecordSuggested: (transfer: SuggestedTransfer) => void;
  onOneTapSettleTransfer: (transfer: SuggestedTransfer) => void;
  onMarkAllSettled: () => void;
  onRecordCustom: () => void;
  onDeleteSettlement: (settlementId: string) => void;
}

export function SettleUpScreen({
  trip,
  expenses,
  settlements,
  onRecordSuggested,
  onOneTapSettleTransfer,
  onMarkAllSettled,
  onRecordCustom,
  onDeleteSettlement,
}: SettleUpScreenProps) {
  const balances = useMemo(
    () => computeMemberBalances(trip, expenses, settlements),
    [trip, expenses, settlements]
  );

  const transfers = useMemo(
    () => computeMinimumTransfers(balances),
    [balances]
  );

  const rawEdgeCount = useMemo(
    () => countUnsimplifiedEdges(trip, expenses, settlements),
    [trip, expenses, settlements]
  );

  const totalPendingCents = useMemo(
    () => transfers.reduce((sum, t) => sum + t.amountCents, 0),
    [transfers]
  );

  const sortedSettlements = useMemo(
    () => [...settlements].sort((a, b) => b.createdAt - a.createdAt),
    [settlements]
  );

  const savedTransactions = Math.max(0, rawEdgeCount - transfers.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {trip.name} · Debt Simplifier
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-0.5">
            Settle Up in Fewest Payments
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRecordCustom}
            className="h-11 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Custom Payment
          </button>
          {transfers.length > 1 && (
            <button
              type="button"
              onClick={onMarkAllSettled}
              className="h-11 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold inline-flex items-center gap-2 btn-primary-glow transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark All Settled
            </button>
          )}
        </div>
      </div>

      {/* Simplification Hero Banner */}
      <div className="card-surface rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
            <Sparkles className="w-4 h-4" />
            <span>Optimal Settlement Plan</span>
          </div>
          {transfers.length === 0 ? (
            <p className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              All balances are settled!
            </p>
          ) : (
            <p className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              {transfers.length}{' '}
              {transfers.length === 1 ? 'payment' : 'payments'} settle{' '}
              <span className="tabular-nums">
                {formatCents(totalPendingCents, trip.currency)}
              </span>
            </p>
          )}
          <p className="text-sm text-slate-600">
            {transfers.length === 0
              ? 'Zero remaining transfers required across all travelers.'
              : savedTransactions > 0
                ? `Simplified from ${rawEdgeCount} individual IOUs down to ${transfers.length} direct transfers (saving ${savedTransactions} ${savedTransactions === 1 ? 'payment' : 'payments'}).`
                : `Already at the mathematical minimum of ${transfers.length} ${transfers.length === 1 ? 'transfer' : 'transfers'}.`}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-6">
          <div>
            <span className="text-xs text-slate-500 block">Unsimplified</span>
            <span className="font-display text-xl font-bold text-slate-400 line-through tabular-nums">
              {rawEdgeCount}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div>
            <span className="text-xs text-slate-500 block">Minimum</span>
            <span className="font-display text-2xl font-extrabold text-[#059669] tabular-nums">
              {transfers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Suggested Transfer Flow Connector Cards */}
      {transfers.length === 0 ? (
        <div className="card-surface rounded-2xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Everyone is squared up
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            No one owes anything right now. When you log new shared bills, the fewest-payments plan will update automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((t, index) => {
            const from = trip.friends.find((f) => f.id === t.fromId);
            const to = trip.friends.find((f) => f.id === t.toId);
            const fromIsMe = from?.id === trip.currentUserId;
            const toIsMe = to?.id === trip.currentUserId;

            return (
              <div
                key={`${t.fromId}_${t.toId}_${index}`}
                className="card-surface rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Flow Connector Visual: Debtor ---- $Amount ----> Creditor */}
                <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-5 flex-1 min-w-0">
                  {/* Debtor */}
                  <div className="flex items-center gap-2.5 min-w-[110px]">
                    <Avatar friend={from} size="md" isMe={fromIsMe} />
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                        {from?.name ?? 'Unknown'}
                        {fromIsMe ? ' (You)' : ''}
                      </p>
                      <p className="text-xs font-medium text-[#E11D48]">
                        Sends
                      </p>
                    </div>
                  </div>

                  {/* Dotted Directional Link + Amount */}
                  <div className="flex-1 max-w-[220px] flex flex-col items-center gap-1 px-1">
                    <span className="font-display font-extrabold text-base sm:text-lg text-slate-900 tabular-nums">
                      {formatCents(t.amountCents, trip.currency)}
                    </span>
                    <div className="w-full flex items-center text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="flex-1 border-t-2 border-dotted border-slate-400 mx-1" />
                      <ArrowRight className="w-4 h-4 text-[#10B981] shrink-0" />
                    </div>
                  </div>

                  {/* Creditor */}
                  <div className="flex items-center gap-2.5 min-w-[110px] justify-end sm:justify-start">
                    <Avatar friend={to} size="md" isMe={toIsMe} />
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                        {to?.name ?? 'Unknown'}
                        {toIsMe ? ' (You)' : ''}
                      </p>
                      <p className="text-xs font-medium text-[#059669]">
                        Receives
                      </p>
                    </div>
                  </div>
                </div>

                {/* One-tap Mark Settled + Custom/Partial */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRecordSuggested(t)}
                    className="h-11 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    Partial / Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onOneTapSettleTransfer(t)}
                    className="flex-1 md:flex-initial h-11 px-5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 btn-primary-glow transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Settled
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settlement History */}
      <div className="card-surface rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Payment History ({sortedSettlements.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Recorded settlements automatically update live balances and remaining transfers.
            </p>
          </div>
        </div>

        {sortedSettlements.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">
            No payments recorded yet for this trip.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {sortedSettlements.map((stl) => {
              const from = trip.friends.find((f) => f.id === stl.fromId);
              const to = trip.friends.find((f) => f.id === stl.toId);
              return (
                <div
                  key={stl.id}
                  className="px-4 py-3 bg-white flex items-center justify-between gap-3"
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
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Undo settlement"
                      aria-label="Undo settlement"
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
  );
}
