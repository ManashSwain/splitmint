import { useState } from 'react';
import { X, Pencil, Trash2, Calendar, FileText } from 'lucide-react';
import { Expense, Trip } from '../types';
import { formatCents, formatShortDate } from '../utils/currency';
import { CATEGORIES, CategoryIconCircle } from './CategoryBadge';
import { Avatar } from './Avatar';

interface ExpenseDetailDrawerProps {
  expense: Expense;
  trip: Trip;
  onEdit: () => void;
  onDelete: (expenseId: string) => void;
  onClose: () => void;
}

export function ExpenseDetailDrawer({
  expense,
  trip,
  onEdit,
  onDelete,
  onClose,
}: ExpenseDetailDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const payer = trip.friends.find((f) => f.id === expense.paidById);
  const categoryCfg = CATEGORIES[expense.category] ?? CATEGORIES.other;
  const splitLabel =
    expense.splitMode === 'equal'
      ? 'Split equally'
      : expense.splitMode === 'exact'
        ? 'Custom exact amounts'
        : expense.splitMode === 'percentage'
          ? 'Split by percentage'
          : 'Split by shares';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-drawer-title"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <CategoryIconCircle category={expense.category} size="md" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">
                {categoryCfg.label} · {splitLabel}
              </p>
              <h2
                id="detail-drawer-title"
                className="font-display text-base font-bold text-slate-900 truncate"
              >
                {expense.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Close bill details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Total & Payer */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80 gap-3">
            <div>
              <span className="text-xs font-medium text-slate-500 block">
                Total Bill ({trip.currency})
              </span>
              <span className="font-display text-3xl font-extrabold text-slate-900 tabular-nums">
                {formatCents(expense.amountCents, trip.currency)}
              </span>
              {expense.originalCurrency &&
                expense.originalCurrency !== trip.currency &&
                expense.originalAmountCents !== undefined && (
                  <p className="text-xs font-medium text-slate-500 mt-1 tabular-nums">
                    Originally{' '}
                    <strong className="text-slate-700">
                      {formatCents(
                        expense.originalAmountCents,
                        expense.originalCurrency
                      )}{' '}
                      {expense.originalCurrency}
                    </strong>
                    {expense.exchangeRate
                      ? ` · Rate 1 ${expense.originalCurrency} = ${expense.exchangeRate} ${trip.currency}`
                      : ''}
                  </p>
                )}
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Paid By
              </span>
              <div className="inline-flex items-center gap-2">
                <Avatar
                  friend={payer}
                  size="xs"
                  isMe={payer?.id === trip.currentUserId}
                />
                <span className="text-sm font-semibold text-slate-900">
                  {payer?.name ?? 'Unknown'}
                  {payer?.id === trip.currentUserId ? ' (You)' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Date & Notes */}
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{formatShortDate(expense.date)} ({expense.date})</span>
            </div>
            {expense.notes && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{expense.notes}</span>
              </div>
            )}
          </div>

          {/* Itemized Receipt Items (if captured via Smart Receipt) */}
          {expense.receiptItems && expense.receiptItems.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Itemized Receipt ({expense.receiptItems.length})
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {expense.receiptItems.map((item) => {
                  const displayCurrency =
                    expense.originalCurrency ?? trip.currency;
                  const sharerNames = item.sharedByIds
                    .map(
                      (id) =>
                        trip.friends.find((f) => f.id === id)?.name ?? 'Friend'
                    )
                    .join(', ');
                  return (
                    <div
                      key={item.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {sharerNames || 'Shared'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-slate-900 shrink-0">
                        {formatCents(item.amountCents, displayCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-person Split Breakdown */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Split Breakdown
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {trip.friends.map((friend) => {
                const share = expense.splits[friend.id] ?? 0;
                const isPayer = friend.id === expense.paidById;
                const pct =
                  expense.amountCents > 0
                    ? Math.round((share / expense.amountCents) * 100)
                    : 0;
                return (
                  <div
                    key={friend.id}
                    className={`px-3.5 py-2.5 flex items-center justify-between ${
                      share === 0 ? 'bg-slate-50/70 opacity-60' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        friend={friend}
                        size="sm"
                        isMe={friend.id === trip.currentUserId}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {friend.name}
                          {friend.id === trip.currentUserId ? ' (You)' : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {isPayer ? 'Paid full bill' : share > 0 ? `${pct}% of bill` : 'Not included'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {formatCents(share, trip.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDelete(expense.id)}
                className="h-11 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-11 px-3 rounded-lg bg-slate-200 text-slate-800 text-sm font-semibold"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="h-11 px-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={onEdit}
            className="h-11 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Bill
          </button>
        </div>
      </div>
    </div>
  );
}
