import React, { useMemo, useState } from 'react';
import { X, Check, Minus, Plus, Scale, ArrowLeftRight, RotateCcw, Sparkles } from 'lucide-react';
import {
  CategoryId,
  CurrencyCode,
  Expense,
  SplitMode,
  Trip,
} from '../types';
import {
  CURRENCIES,
  centsToInputString,
  convertMinorUnits,
  formatCents,
  getCurrencyMeta,
  getDefaultExchangeRate,
  parseMajorToCents,
} from '../utils/currency';
import {
  computeEqualSplits,
  computeProportionalSplits,
} from '../utils/ledger';
import { CATEGORY_LIST } from './CategoryBadge';
import { Avatar } from './Avatar';

interface ExpenseModalProps {
  trip: Trip;
  existingExpense?: Expense | null;
  onSave: (expense: Expense) => void;
  onSwitchToReceiptCapture?: () => void;
  onClose: () => void;
}

export function ExpenseModal({
  trip,
  existingExpense,
  onSave,
  onSwitchToReceiptCapture,
  onClose,
}: ExpenseModalProps) {
  const isEditing = Boolean(existingExpense);

  const initialBillCurrency: CurrencyCode =
    existingExpense?.originalCurrency ?? trip.currency;
  const initialOriginalCents = existingExpense
    ? existingExpense.originalAmountCents ?? existingExpense.amountCents
    : 0;
  const initialRate =
    existingExpense?.exchangeRate ??
    getDefaultExchangeRate(initialBillCurrency, trip.currency);

  const [title, setTitle] = useState(existingExpense?.title ?? '');
  const [billCurrency, setBillCurrency] =
    useState<CurrencyCode>(initialBillCurrency);
  const [rateStr, setRateStr] = useState<string>(String(initialRate));
  const [amountStr, setAmountStr] = useState(
    existingExpense
      ? centsToInputString(initialOriginalCents, initialBillCurrency)
      : ''
  );
  const [paidById, setPaidById] = useState(
    existingExpense?.paidById ?? trip.currentUserId ?? trip.friends[0]?.id ?? ''
  );
  const [category, setCategory] = useState<CategoryId>(
    existingExpense?.category ?? 'dining'
  );
  const [date, setDate] = useState(
    existingExpense?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(existingExpense?.notes ?? '');
  const [splitMode, setSplitMode] = useState<SplitMode>(
    existingExpense?.splitMode ?? 'equal'
  );

  // Equal mode selection
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (existingExpense) {
      const active = Object.entries(existingExpense.splits)
        .filter(([, v]) => v > 0)
        .map(([id]) => id);
      return active.length > 0 ? active : trip.friends.map((f) => f.id);
    }
    return trip.friends.map((f) => f.id);
  });

  // Exact mode strings (in billCurrency!)
  const [exactInputs, setExactInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (existingExpense) {
      const origTotal =
        existingExpense.originalAmountCents ?? existingExpense.amountCents;
      const proportionalInOrig =
        initialBillCurrency !== trip.currency
          ? computeProportionalSplits(origTotal, existingExpense.splits)
          : existingExpense.splits;

      for (const f of trip.friends) {
        const val = proportionalInOrig[f.id] ?? 0;
        map[f.id] =
          val > 0 ? centsToInputString(val, initialBillCurrency) : '';
      }
    } else {
      for (const f of trip.friends) map[f.id] = '';
    }
    return map;
  });

  // Percentage mode values
  const [percentInputs, setPercentInputs] = useState<Record<string, number>>(
    () => {
      const map: Record<string, number> = {};
      if (
        existingExpense?.splitMode === 'percentage' &&
        existingExpense.splitMeta
      ) {
        for (const f of trip.friends) {
          map[f.id] = existingExpense.splitMeta[f.id] ?? 0;
        }
        return map;
      }
      const equalPct =
        trip.friends.length > 0
          ? Math.floor(10000 / trip.friends.length) / 100
          : 0;
      let running = 0;
      trip.friends.forEach((f, idx) => {
        if (idx === trip.friends.length - 1) {
          map[f.id] = Number((100 - running).toFixed(2));
        } else {
          map[f.id] = equalPct;
          running += equalPct;
        }
      });
      return map;
    }
  );

  // Shares mode weights
  const [shareInputs, setShareInputs] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (existingExpense?.splitMode === 'shares' && existingExpense.splitMeta) {
      for (const f of trip.friends) {
        map[f.id] = existingExpense.splitMeta[f.id] ?? 0;
      }
      return map;
    }
    for (const f of trip.friends) {
      map[f.id] = 1;
    }
    return map;
  });

  const [error, setError] = useState('');

  const billMeta = getCurrencyMeta(billCurrency);
  const isForeign = billCurrency !== trip.currency;
  const parsedRate = useMemo(() => {
    if (!isForeign) return 1;
    const val = Number.parseFloat(rateStr);
    return Number.isFinite(val) && val > 0 ? val : 0;
  }, [isForeign, rateStr]);

  const originalMinorCents = parseMajorToCents(amountStr, billCurrency);
  const convertedHomeCents = useMemo(() => {
    if (!isForeign) return originalMinorCents;
    if (parsedRate <= 0) return 0;
    return convertMinorUnits(
      originalMinorCents,
      billCurrency,
      trip.currency,
      parsedRate
    );
  }, [isForeign, originalMinorCents, billCurrency, trip.currency, parsedRate]);

  const handleBillCurrencyChange = (nextCurrency: CurrencyCode) => {
    setBillCurrency(nextCurrency);
    const defaultRate = getDefaultExchangeRate(nextCurrency, trip.currency);
    setRateStr(String(defaultRate));
    setError('');
  };

  // Live preview splits in trip home currency
  const computedSplits = useMemo(() => {
    if (splitMode === 'equal') {
      return computeEqualSplits(convertedHomeCents, selectedIds);
    }
    if (splitMode === 'exact') {
      if (!isForeign) {
        const res: Record<string, number> = {};
        for (const f of trip.friends) {
          const val = parseMajorToCents(exactInputs[f.id] ?? '', billCurrency);
          if (val > 0) res[f.id] = val;
        }
        return res;
      }
      // Convert exact inputs from billCurrency proportionally into convertedHomeCents
      const weights: Record<string, number> = {};
      for (const f of trip.friends) {
        const val = parseMajorToCents(exactInputs[f.id] ?? '', billCurrency);
        if (val > 0) weights[f.id] = val;
      }
      return computeProportionalSplits(convertedHomeCents, weights);
    }
    if (splitMode === 'percentage') {
      return computeProportionalSplits(convertedHomeCents, percentInputs);
    }
    return computeProportionalSplits(convertedHomeCents, shareInputs);
  }, [
    splitMode,
    convertedHomeCents,
    selectedIds,
    isForeign,
    exactInputs,
    percentInputs,
    shareInputs,
    trip.friends,
    billCurrency,
  ]);

  const exactSumInBillCurrency = useMemo(() => {
    return trip.friends.reduce(
      (sum, f) => sum + parseMajorToCents(exactInputs[f.id] ?? '', billCurrency),
      0
    );
  }, [exactInputs, trip.friends, billCurrency]);

  const percentSum = useMemo(() => {
    return trip.friends.reduce((sum, f) => sum + (percentInputs[f.id] ?? 0), 0);
  }, [percentInputs, trip.friends]);

  const totalShares = useMemo(() => {
    return trip.friends.reduce((sum, f) => sum + (shareInputs[f.id] ?? 0), 0);
  }, [shareInputs, trip.friends]);

  const toggleEqualParticipant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSplitRemainingExact = () => {
    if (originalMinorCents <= 0) return;
    const emptyFriends = trip.friends.filter(
      (f) => parseMajorToCents(exactInputs[f.id] ?? '', billCurrency) === 0
    );
    const remaining = originalMinorCents - exactSumInBillCurrency;
    if (remaining <= 0) return;

    const targets = emptyFriends.length > 0 ? emptyFriends : trip.friends;
    const addition = computeEqualSplits(
      remaining,
      targets.map((f) => f.id)
    );
    setExactInputs((prev) => {
      const next = { ...prev };
      for (const t of targets) {
        const current = parseMajorToCents(prev[t.id] ?? '', billCurrency);
        next[t.id] = centsToInputString(
          current + (addition[t.id] ?? 0),
          billCurrency
        );
      }
      return next;
    });
  };

  const handleEqualizePercentages = () => {
    const count = trip.friends.length;
    if (count === 0) return;
    const base = Math.floor(10000 / count) / 100;
    const next: Record<string, number> = {};
    let running = 0;
    trip.friends.forEach((f, idx) => {
      if (idx === count - 1) {
        next[f.id] = Number((100 - running).toFixed(2));
      } else {
        next[f.id] = base;
        running += base;
      }
    });
    setPercentInputs(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Enter a bill description (e.g., Dinner at Pontocho).');
      return;
    }
    if (originalMinorCents <= 0) {
      setError('Enter a bill amount greater than zero.');
      return;
    }
    if (isForeign && (parsedRate <= 0 || convertedHomeCents <= 0)) {
      setError('Enter a valid positive exchange rate.');
      return;
    }

    if (splitMode === 'equal' && selectedIds.length === 0) {
      setError('Select at least one person to split this bill.');
      return;
    }

    if (
      splitMode === 'exact' &&
      exactSumInBillCurrency !== originalMinorCents
    ) {
      const diff = originalMinorCents - exactSumInBillCurrency;
      setError(
        diff > 0
          ? `${formatCents(diff, billCurrency)} still needs to be allocated.`
          : `Split exceeds bill total by ${formatCents(Math.abs(diff), billCurrency)}.`
      );
      return;
    }

    if (splitMode === 'percentage' && Math.abs(percentSum - 100) > 0.1) {
      setError(
        `Percentages must add up to 100% (currently ${percentSum.toFixed(1)}%).`
      );
      return;
    }

    if (splitMode === 'shares' && totalShares <= 0) {
      setError('Assign at least 1 share to someone.');
      return;
    }

    const splitMeta =
      splitMode === 'percentage'
        ? percentInputs
        : splitMode === 'shares'
          ? shareInputs
          : undefined;

    onSave({
      id: existingExpense?.id ?? `exp_${Date.now()}`,
      tripId: trip.id,
      title: cleanTitle,
      amountCents: convertedHomeCents,
      paidById,
      category,
      date,
      splitMode,
      splits: computedSplits,
      splitMeta,
      originalCurrency: isForeign ? billCurrency : undefined,
      originalAmountCents: isForeign ? originalMinorCents : undefined,
      exchangeRate: isForeign ? parsedRate : undefined,
      notes: notes.trim() || undefined,
      createdAt: existingExpense?.createdAt ?? Date.now(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 gap-3">
          <div className="min-w-0">
            <h2
              id="expense-modal-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              {isEditing ? 'Edit Shared Bill' : 'Log Shared Bill'}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {trip.name} · Home currency {trip.currency}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isEditing && onSwitchToReceiptCapture && (
              <button
                type="button"
                onClick={onSwitchToReceiptCapture}
                className="h-9 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#059669] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Smart Receipt
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto px-6 py-5 space-y-5"
        >
          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Title, Bill Currency & Amount */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="exp-title"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Bill Description
              </label>
              <input
                id="exp-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sushi dinner, Uber to airport"
                className="w-full h-12 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
              />
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2">
                <label
                  htmlFor="exp-currency"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Currency
                </label>
                <select
                  id="exp-currency"
                  value={billCurrency}
                  onChange={(e) =>
                    handleBillCurrencyChange(e.target.value as CurrencyCode)
                  }
                  className="w-full h-12 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                      {c.code === trip.currency ? ' · Home' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <label
                  htmlFor="exp-amount"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Amount ({billCurrency})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                    {billMeta.symbol}
                  </span>
                  <input
                    id="exp-amount"
                    type="number"
                    step={billMeta.decimals === 0 ? '1' : '0.01'}
                    min="0"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder={billMeta.decimals === 0 ? '4500' : '0.00'}
                    className="w-full h-12 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-display font-bold text-lg tabular-nums focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
                  />
                </div>
              </div>
            </div>

            {/* Automatic Currency Conversion Panel */}
            {isForeign && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                  <ArrowLeftRight className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span className="font-semibold text-slate-800">
                    1 {billCurrency} =
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={rateStr}
                    onChange={(e) => setRateStr(e.target.value)}
                    aria-label={`Exchange rate from ${billCurrency} to ${trip.currency}`}
                    className="w-24 h-8 px-2 rounded-md border border-slate-300 bg-white text-xs font-semibold tabular-nums text-slate-900 focus:outline-none focus:border-[#10B981]"
                  />
                  <span className="font-semibold text-slate-800">
                    {trip.currency}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRateStr(
                        String(
                          getDefaultExchangeRate(billCurrency, trip.currency)
                        )
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 ml-1"
                    title="Reset to default rate"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[11px] text-slate-500 block">
                    Converted to {trip.currency}
                  </span>
                  <span className="font-display text-base font-extrabold text-[#059669] tabular-nums">
                    {formatCents(convertedHomeCents, trip.currency)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Category Tag Grid */}
          <div>
            <span className="block text-sm font-semibold text-slate-700 mb-2">
              Category
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORY_LIST.map((cat) => {
                const Icon = cat.icon;
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`min-h-[44px] py-2 px-2 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                      active
                        ? 'border-[#10B981] bg-emerald-50/70 text-emerald-800 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate max-w-full">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid By & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="exp-payer"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Paid By
              </label>
              <select
                id="exp-payer"
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="w-full h-12 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
              >
                {trip.friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.id === trip.currentUserId ? ' (You)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="exp-date"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Date
              </label>
              <input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-12 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
              />
            </div>
          </div>

          {/* Split Mode Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-sm font-semibold text-slate-800 inline-flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#10B981]" />
                Split Method
              </span>

              <div
                className="inline-flex p-1 rounded-lg bg-slate-100"
                role="tablist"
                aria-label="Split mode"
              >
                {(
                  [
                    { id: 'equal', label: 'Equal' },
                    { id: 'exact', label: 'Exact' },
                    { id: 'percentage', label: '%' },
                    { id: 'shares', label: 'Shares' },
                  ] as { id: SplitMode; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={splitMode === tab.id}
                    onClick={() => {
                      setSplitMode(tab.id);
                      setError('');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      splitMode === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Equal Mode */}
            {splitMode === 'equal' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>
                    {selectedIds.length} of {trip.friends.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds(
                        selectedIds.length === trip.friends.length
                          ? []
                          : trip.friends.map((f) => f.id)
                      )
                    }
                    className="font-semibold text-[#059669] hover:underline"
                  >
                    {selectedIds.length === trip.friends.length
                      ? 'Clear all'
                      : 'Select all'}
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {trip.friends.map((friend) => {
                    const checked = selectedIds.includes(friend.id);
                    const share = computedSplits[friend.id] ?? 0;
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => toggleEqualParticipant(friend.id)}
                        className={`w-full min-h-[52px] px-3.5 py-2.5 flex items-center justify-between text-left transition-colors ${
                          checked
                            ? 'bg-white hover:bg-slate-50'
                            : 'bg-slate-50/70 opacity-65'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                              checked
                                ? 'bg-[#10B981] border-[#10B981] text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <Avatar
                            friend={friend}
                            size="sm"
                            isMe={friend.id === trip.currentUserId}
                          />
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {friend.name}
                            {friend.id === trip.currentUserId ? ' (You)' : ''}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-slate-800">
                          {checked
                            ? formatCents(share, trip.currency)
                            : formatCents(0, trip.currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Exact Mode (in Bill Currency, auto-converted to Home Currency) */}
            {splitMode === 'exact' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-600 font-medium">
                    Allocated ({billCurrency}):{' '}
                    <strong className="text-slate-900 tabular-nums">
                      {formatCents(exactSumInBillCurrency, billCurrency)}
                    </strong>{' '}
                    of {formatCents(originalMinorCents, billCurrency)}
                  </span>
                  {originalMinorCents > 0 &&
                  exactSumInBillCurrency !== originalMinorCents ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold tabular-nums ${
                          originalMinorCents - exactSumInBillCurrency > 0
                            ? 'text-amber-700'
                            : 'text-rose-600'
                        }`}
                      >
                        {originalMinorCents - exactSumInBillCurrency > 0
                          ? `${formatCents(
                              originalMinorCents - exactSumInBillCurrency,
                              billCurrency
                            )} left`
                          : `${formatCents(
                              exactSumInBillCurrency - originalMinorCents,
                              billCurrency
                            )} over`}
                      </span>
                      {originalMinorCents - exactSumInBillCurrency > 0 && (
                        <button
                          type="button"
                          onClick={handleSplitRemainingExact}
                          className="text-[#059669] font-semibold hover:underline"
                        >
                          Auto-fill
                        </button>
                      )}
                    </div>
                  ) : originalMinorCents > 0 ? (
                    <span className="text-[#059669] font-semibold">Balanced</span>
                  ) : null}
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {trip.friends.map((friend) => {
                    const convertedShare = computedSplits[friend.id] ?? 0;
                    return (
                      <div
                        key={friend.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            friend={friend}
                            size="sm"
                            isMe={friend.id === trip.currentUserId}
                          />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-slate-900 truncate block">
                              {friend.name}
                            </span>
                            {isForeign && convertedShare > 0 && (
                              <span className="text-[11px] text-slate-500 tabular-nums">
                                ≈ {formatCents(convertedShare, trip.currency)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                            {billMeta.symbol}
                          </span>
                          <input
                            type="number"
                            step={billMeta.decimals === 0 ? '1' : '0.01'}
                            min="0"
                            value={exactInputs[friend.id] ?? ''}
                            onChange={(e) =>
                              setExactInputs((prev) => ({
                                ...prev,
                                [friend.id]: e.target.value,
                              }))
                            }
                            placeholder={billMeta.decimals === 0 ? '0' : '0.00'}
                            className="w-full h-10 pl-7 pr-2.5 rounded-lg border border-slate-300 text-right text-sm font-semibold tabular-nums focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/15"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Percentage Mode */}
            {splitMode === 'percentage' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-600 font-medium">
                    Total:{' '}
                    <strong
                      className={`tabular-nums ${
                        Math.abs(percentSum - 100) <= 0.1
                          ? 'text-[#059669]'
                          : 'text-rose-600'
                      }`}
                    >
                      {percentSum.toFixed(1)}%
                    </strong>{' '}
                    / 100%
                  </span>
                  <button
                    type="button"
                    onClick={handleEqualizePercentages}
                    className="font-semibold text-[#059669] hover:underline"
                  >
                    Reset equal %
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {trip.friends.map((friend) => {
                    const pct = percentInputs[friend.id] ?? 0;
                    const share = computedSplits[friend.id] ?? 0;
                    return (
                      <div
                        key={friend.id}
                        className="px-3.5 py-3 bg-white space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                              friend={friend}
                              size="sm"
                              isMe={friend.id === trip.currentUserId}
                            />
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {friend.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs text-slate-500 tabular-nums">
                              {formatCents(share, trip.currency)}
                            </span>
                            <div className="relative w-20">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={pct}
                                onChange={(e) =>
                                  setPercentInputs((prev) => ({
                                    ...prev,
                                    [friend.id]: Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        Number(e.target.value) || 0
                                      )
                                    ),
                                  }))
                                }
                                className="w-full h-9 pl-2 pr-6 rounded-md border border-slate-300 text-right text-sm font-semibold tabular-nums focus:outline-none focus:border-[#10B981]"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={pct}
                          onChange={(e) =>
                            setPercentInputs((prev) => ({
                              ...prev,
                              [friend.id]: Number(e.target.value),
                            }))
                          }
                          aria-label={`Percentage for ${friend.name}`}
                          className="w-full split-slider"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shares Mode */}
            {splitMode === 'shares' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-600 font-medium">
                    Total shares:{' '}
                    <strong className="text-slate-900 tabular-nums">
                      {totalShares}x
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const reset: Record<string, number> = {};
                      trip.friends.forEach((f) => (reset[f.id] = 1));
                      setShareInputs(reset);
                    }}
                    className="font-semibold text-[#059669] hover:underline"
                  >
                    Reset all 1x
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {trip.friends.map((friend) => {
                    const count = shareInputs[friend.id] ?? 0;
                    const share = computedSplits[friend.id] ?? 0;
                    return (
                      <div
                        key={friend.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white"
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
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              {formatCents(share, trip.currency)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setShareInputs((prev) => ({
                                ...prev,
                                [friend.id]: Math.max(
                                  0,
                                  (prev[friend.id] ?? 0) - 0.5
                                ),
                              }))
                            }
                            className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                            aria-label={`Decrease share for ${friend.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-11 text-center text-sm font-bold tabular-nums text-slate-900">
                            {count}x
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setShareInputs((prev) => ({
                                ...prev,
                                [friend.id]: (prev[friend.id] ?? 0) + 0.5,
                              }))
                            }
                            className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                            aria-label={`Increase share for ${friend.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="exp-notes"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Notes (optional)
            </label>
            <input
              id="exp-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Receipt details, tip included, etc."
              className="w-full h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
            />
          </div>

          {/* Submit Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
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
              <Check className="w-4 h-4" />
              {isEditing ? 'Update Bill' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
