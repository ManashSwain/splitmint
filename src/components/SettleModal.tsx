import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CurrencyCode, Friend, Settlement } from '../types';
import {
  centsToInputString,
  formatCents,
  getCurrencyMeta,
  parseMajorToCents,
} from '../utils/currency';
import { Avatar } from './Avatar';

interface SettleModalProps {
  tripId: string;
  currency: CurrencyCode;
  friends: Friend[];
  initialFromId?: string;
  initialToId?: string;
  initialAmountCents?: number;
  onSave: (settlement: Settlement) => void;
  onClose: () => void;
}

export function SettleModal({
  tripId,
  currency,
  friends,
  initialFromId,
  initialToId,
  initialAmountCents,
  onSave,
  onClose,
}: SettleModalProps) {
  const defaultFrom = initialFromId ?? friends[0]?.id ?? '';
  const defaultTo =
    initialToId ??
    friends.find((f) => f.id !== defaultFrom)?.id ??
    friends[0]?.id ??
    '';

  const [fromId, setFromId] = useState(defaultFrom);
  const [toId, setToId] = useState(defaultTo);
  const [amountInput, setAmountInput] = useState(
    initialAmountCents && initialAmountCents > 0
      ? centsToInputString(initialAmountCents, currency)
      : ''
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const meta = getCurrencyMeta(currency);
  const fromFriend = friends.find((f) => f.id === fromId);
  const toFriend = friends.find((f) => f.id === toId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId) {
      setError('Payer and recipient must be two different people.');
      return;
    }
    const cents = parseMajorToCents(amountInput, currency);
    if (cents <= 0) {
      setError('Enter a payment amount greater than zero.');
      return;
    }

    onSave({
      id: `stl_${Date.now()}`,
      tripId,
      fromId,
      toId,
      amountCents: cents,
      date,
      note: note.trim() || undefined,
      createdAt: Date.now(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-modal-title"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2
            id="settle-modal-title"
            className="font-display text-lg font-bold text-slate-900"
          >
            Record Payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Visual Flow Summary */}
          <div className="flex items-center justify-center gap-4 py-4 px-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex flex-col items-center gap-1.5 min-w-[76px]">
              <Avatar friend={fromFriend} size="md" />
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[84px]">
                {fromFriend?.name}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 text-emerald-600">
              <span className="font-display font-bold text-sm tabular-nums text-slate-900">
                {parseMajorToCents(amountInput, currency) > 0
                  ? formatCents(parseMajorToCents(amountInput, currency), currency)
                  : `${meta.symbol}0`}
              </span>
              <div className="flex items-center gap-1 text-[#10B981]">
                <span className="w-8 border-t-2 border-dotted border-[#10B981]" />
                <ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium text-slate-500">pays</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 min-w-[76px]">
              <Avatar friend={toFriend} size="md" />
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[84px]">
                {toFriend?.name}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="settle-from"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Paid By
              </label>
              <select
                id="settle-from"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full h-12 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="settle-to"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Paid To
              </label>
              <select
                id="settle-to"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full h-12 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="settle-amount"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Amount ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                  {meta.symbol}
                </span>
                <input
                  id="settle-amount"
                  type="number"
                  step={meta.decimals === 0 ? '1' : '0.01'}
                  min="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-12 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold tabular-nums focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="settle-date"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Date
              </label>
              <input
                id="settle-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-12 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="settle-note"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Note (optional)
            </label>
            <input
              id="settle-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Venmo, Zelle, or cash"
              className="w-full h-12 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-12 px-6 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold inline-flex items-center gap-2 btn-primary-glow transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
