import { useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
  ArrowLeftRight,
  RotateCcw,
  Loader2,
  Receipt,
} from 'lucide-react';
import {
  CategoryId,
  CurrencyCode,
  Expense,
  ReceiptLineItem,
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

interface ReceiptCaptureModalProps {
  trip: Trip;
  onSave: (expense: Expense) => void;
  onClose: () => void;
}

interface DraftItem {
  id: string;
  name: string;
  amountStr: string;
  sharedByIds: string[];
}

interface ParsedReceiptResponse {
  title: string;
  currency: CurrencyCode;
  category: CategoryId;
  date: string;
  items: {
    name: string;
    amount: number;
    suggestedSharers: string[];
  }[];
  tax: number;
  tip: number;
}

const SAMPLE_RECEIPTS = [
  {
    label: 'Tokyo Izakaya (JPY)',
    text: `Pontocho Izakaya 2026-11-12
2x Spicy Miso Ramen ¥2,800
Karaage Chicken ¥1,100
4x Yuzu Highball ¥3,200
Edamame & Gyoza ¥1,400
Service & Tax ¥850
Tip ¥500`,
  },
  {
    label: 'Mumbai Dinner (INR)',
    text: `Bombay Canteen bill:
Butter Garlic Crab ₹1,450 (Maya and Liam)
2x Pulled Pork Tacos ₹900 (Sofia, Noah)
Truffle Kulcha ₹650 (everyone)
2x Kokum Gin Tonic ₹1,300 (Maya, Sofia)
GST 5% ₹215
Tip ₹400`,
  },
  {
    label: 'Brunch Chat Note (USD)',
    text: `hey guys brunch at tartine was $118.40:
avo toast 18
shakshuka 22
2x almond croissant 14
cold brew flight 12
mimosa pitcher 32 (liam & noah)
tax 9.40
tip 11`,
  },
];

export function ReceiptCaptureModal({
  trip,
  onSave,
  onClose,
}: ReceiptCaptureModalProps) {
  const [step, setStep] = useState<'paste' | 'assign'>('paste');
  const [receiptText, setReceiptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extracted / editable bill state
  const [title, setTitle] = useState('');
  const [billCurrency, setBillCurrency] = useState<CurrencyCode>(trip.currency);
  const [rateStr, setRateStr] = useState('1');
  const [category, setCategory] = useState<CategoryId>('dining');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidById, setPaidById] = useState(
    trip.currentUserId ?? trip.friends[0]?.id ?? ''
  );
  const [items, setItems] = useState<DraftItem[]>([]);
  const [taxStr, setTaxStr] = useState('0');
  const [tipStr, setTipStr] = useState('0');
  const [taxTipMode, setTaxTipMode] = useState<'proportional' | 'equal'>(
    'proportional'
  );

  const billMeta = getCurrencyMeta(billCurrency);
  const isForeign = billCurrency !== trip.currency;

  const parsedRate = useMemo(() => {
    if (!isForeign) return 1;
    const val = Number.parseFloat(rateStr);
    return Number.isFinite(val) && val > 0 ? val : 0;
  }, [isForeign, rateStr]);

  const handleExtract = async () => {
    if (receiptText.trim().length < 3) {
      setError('Paste a receipt or chat note first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/receipts/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptText: receiptText.trim(),
          defaultCurrency: trip.currency,
          friendNames: trip.friends.map((f) => f.name),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.error || 'Could not extract items from this receipt.'
        );
      }

      const parsed = data as ParsedReceiptResponse;
      const resolvedCurrency = CURRENCIES[parsed.currency]
        ? parsed.currency
        : trip.currency;
      const meta = getCurrencyMeta(resolvedCurrency);

      const friendNameLookup = new Map<string, string>();
      for (const f of trip.friends) {
        friendNameLookup.set(f.name.trim().toLowerCase(), f.id);
      }

      const mappedItems: DraftItem[] = (parsed.items ?? []).map((it, idx) => {
        const matchedIds: string[] = [];
        for (const name of it.suggestedSharers ?? []) {
          const lower = name.trim().toLowerCase();
          if (
            lower === 'everyone' ||
            lower === 'all' ||
            lower === 'everybody'
          ) {
            trip.friends.forEach((f) => {
              if (!matchedIds.includes(f.id)) matchedIds.push(f.id);
            });
            continue;
          }
          const exact = friendNameLookup.get(lower);
          if (exact && !matchedIds.includes(exact)) {
            matchedIds.push(exact);
            continue;
          }
          const partial = trip.friends.find(
            (f) =>
              f.name.toLowerCase().includes(lower) ||
              lower.includes(f.name.toLowerCase())
          );
          if (partial && !matchedIds.includes(partial.id)) {
            matchedIds.push(partial.id);
          }
        }

        const amountFormatted =
          meta.decimals === 0
            ? String(Math.round(it.amount))
            : it.amount.toFixed(2);

        return {
          id: `item_${Date.now()}_${idx}`,
          name: it.name,
          amountStr: amountFormatted,
          sharedByIds: matchedIds,
        };
      });

      if (mappedItems.length === 0) {
        throw new Error(
          'No line items were detected. Try including item names and prices.'
        );
      }

      setTitle(parsed.title || 'Receipt Bill');
      setBillCurrency(resolvedCurrency);
      setRateStr(
        String(getDefaultExchangeRate(resolvedCurrency, trip.currency))
      );
      setCategory(parsed.category || 'dining');
      setDate(parsed.date || new Date().toISOString().slice(0, 10));
      setItems(mappedItems);
      setTaxStr(
        parsed.tax > 0
          ? meta.decimals === 0
            ? String(Math.round(parsed.tax))
            : parsed.tax.toFixed(2)
          : '0'
      );
      setTipStr(
        parsed.tip > 0
          ? meta.decimals === 0
            ? String(Math.round(parsed.tip))
            : parsed.tip.toFixed(2)
          : '0'
      );
      setStep('assign');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to parse receipt. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (nextCurrency: CurrencyCode) => {
    setBillCurrency(nextCurrency);
    setRateStr(String(getDefaultExchangeRate(nextCurrency, trip.currency)));
  };

  const toggleFriendOnItem = (itemId: string, friendId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const exists = it.sharedByIds.includes(friendId);
        return {
          ...it,
          sharedByIds: exists
            ? it.sharedByIds.filter((id) => id !== friendId)
            : [...it.sharedByIds, friendId],
        };
      })
    );
  };

  const toggleAllFriendsOnItem = (itemId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const allSelected = it.sharedByIds.length === trip.friends.length;
        return {
          ...it,
          sharedByIds: allSelected ? [] : trip.friends.map((f) => f.id),
        };
      })
    );
  };

  const handleAssignUnassignedToAll = () => {
    setItems((prev) =>
      prev.map((it) =>
        it.sharedByIds.length === 0
          ? { ...it, sharedByIds: trip.friends.map((f) => f.id) }
          : it
      )
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        name: 'Extra item',
        amountStr: billMeta.decimals === 0 ? '0' : '0.00',
        sharedByIds: trip.friends.map((f) => f.id),
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Compute live totals in billCurrency minor units
  const calculation = useMemo(() => {
    const itemTotalsMinor = items.map((it) => ({
      id: it.id,
      name: it.name,
      cents: parseMajorToCents(it.amountStr, billCurrency),
      sharedByIds: it.sharedByIds,
    }));

    const subtotalMinor = itemTotalsMinor.reduce((s, it) => s + it.cents, 0);
    const taxMinor = parseMajorToCents(taxStr, billCurrency);
    const tipMinor = parseMajorToCents(tipStr, billCurrency);
    const grandTotalMinor = subtotalMinor + taxMinor + tipMinor;

    const perFriendItemMinor: Record<string, number> = {};
    for (const f of trip.friends) perFriendItemMinor[f.id] = 0;

    for (const it of itemTotalsMinor) {
      if (it.cents <= 0 || it.sharedByIds.length === 0) continue;
      const itemSplit = computeEqualSplits(it.cents, it.sharedByIds);
      for (const [fid, share] of Object.entries(itemSplit)) {
        perFriendItemMinor[fid] = (perFriendItemMinor[fid] ?? 0) + share;
      }
    }

    const activeSharers = trip.friends
      .filter((f) => (perFriendItemMinor[f.id] ?? 0) > 0)
      .map((f) => f.id);

    const extrasMinor = taxMinor + tipMinor;
    const extrasSplit =
      extrasMinor > 0
        ? taxTipMode === 'proportional' &&
          Object.values(perFriendItemMinor).some((v) => v > 0)
          ? computeProportionalSplits(extrasMinor, perFriendItemMinor)
          : computeEqualSplits(
              extrasMinor,
              activeSharers.length > 0
                ? activeSharers
                : trip.friends.map((f) => f.id)
            )
        : {};

    const perFriendTotalMinor: Record<string, number> = {};
    for (const f of trip.friends) {
      perFriendTotalMinor[f.id] =
        (perFriendItemMinor[f.id] ?? 0) + (extrasSplit[f.id] ?? 0);
    }

    const convertedHomeCents = isForeign
      ? parsedRate > 0
        ? convertMinorUnits(
            grandTotalMinor,
            billCurrency,
            trip.currency,
            parsedRate
          )
        : 0
      : grandTotalMinor;

    const homeSplits = isForeign
      ? computeProportionalSplits(convertedHomeCents, perFriendTotalMinor)
      : perFriendTotalMinor;

    const unassignedCount = itemTotalsMinor.filter(
      (it) => it.cents > 0 && it.sharedByIds.length === 0
    ).length;

    return {
      itemTotalsMinor,
      subtotalMinor,
      taxMinor,
      tipMinor,
      grandTotalMinor,
      perFriendTotalMinor,
      convertedHomeCents,
      homeSplits,
      unassignedCount,
    };
  }, [
    items,
    taxStr,
    tipStr,
    taxTipMode,
    billCurrency,
    trip.friends,
    trip.currency,
    isForeign,
    parsedRate,
  ]);

  const handleSaveBill = () => {
    if (!title.trim()) {
      setError('Enter a merchant or bill title.');
      return;
    }
    if (calculation.grandTotalMinor <= 0) {
      setError('Bill total must be greater than zero.');
      return;
    }
    if (calculation.unassignedCount > 0) {
      setError(
        `${calculation.unassignedCount} ${
          calculation.unassignedCount === 1 ? 'item has' : 'items have'
        } no friends selected. Tap who shared each item (or tap "Assign unassigned").`
      );
      return;
    }
    if (isForeign && (parsedRate <= 0 || calculation.convertedHomeCents <= 0)) {
      setError('Enter a valid positive exchange rate.');
      return;
    }

    const receiptItems: ReceiptLineItem[] = calculation.itemTotalsMinor
      .filter((it) => it.cents > 0)
      .map((it) => ({
        id: it.id,
        name: it.name.trim() || 'Item',
        amountCents: it.cents,
        sharedByIds: it.sharedByIds,
      }));

    const noteParts: string[] = [];
    if (calculation.taxMinor > 0) {
      noteParts.push(`Tax ${formatCents(calculation.taxMinor, billCurrency)}`);
    }
    if (calculation.tipMinor > 0) {
      noteParts.push(`Tip ${formatCents(calculation.tipMinor, billCurrency)}`);
    }

    onSave({
      id: `exp_${Date.now()}`,
      tripId: trip.id,
      title: title.trim(),
      amountCents: calculation.convertedHomeCents,
      paidById,
      category,
      date,
      splitMode: 'exact',
      splits: calculation.homeSplits,
      originalCurrency: isForeign ? billCurrency : undefined,
      originalAmountCents: isForeign ? calculation.grandTotalMinor : undefined,
      exchangeRate: isForeign ? parsedRate : undefined,
      receiptItems,
      notes:
        noteParts.length > 0
          ? `Itemized receipt (${noteParts.join(' · ')})`
          : 'Itemized receipt capture',
      createdAt: Date.now(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {step === 'assign' && (
              <button
                type="button"
                onClick={() => {
                  setStep('paste');
                  setError('');
                }}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Back to receipt text"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2
                id="receipt-modal-title"
                className="font-display text-lg font-bold text-slate-900 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#10B981]" />
                Smart Receipt Capture
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'paste'
                  ? 'Paste a messy receipt or chat note to extract items, tax & tip'
                  : 'Friends tap the items they shared — tax & tip split automatically'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          {step === 'paste' ? (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="receipt-raw-text"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Receipt Text or Chat Note
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {SAMPLE_RECEIPTS.map((sample) => (
                      <button
                        key={sample.label}
                        type="button"
                        onClick={() => {
                          setReceiptText(sample.text);
                          setError('');
                        }}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 transition-colors"
                      >
                        Try: {sample.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  id="receipt-raw-text"
                  value={receiptText}
                  onChange={(e) => setReceiptText(e.target.value)}
                  rows={8}
                  placeholder={`Paste receipt text or a messy message here, e.g.:\n"Izakaya night: 2x ramen 2800, karaage 1100, 4 drinks 3200, tax 650, tip 500"`}
                  className="w-full p-4 rounded-xl border border-slate-300 bg-slate-50/40 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-slate-500">
                  Trip travelers:{' '}
                  <strong className="text-slate-700">
                    {trip.friends.map((f) => f.name).join(', ')}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={loading || receiptText.trim().length < 3}
                  className="h-12 px-6 rounded-lg bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 btn-primary-glow transition-colors whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting items...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extract Line Items
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Bill Metadata Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label
                    htmlFor="rc-title"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Merchant / Title
                  </label>
                  <input
                    id="rc-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#10B981]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label
                    htmlFor="rc-currency"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Bill Currency
                  </label>
                  <select
                    id="rc-currency"
                    value={billCurrency}
                    onChange={(e) =>
                      handleCurrencyChange(e.target.value as CurrencyCode)
                    }
                    className="w-full h-11 px-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#10B981]"
                  >
                    {Object.values(CURRENCIES).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label
                    htmlFor="rc-payer"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Paid By
                  </label>
                  <select
                    id="rc-payer"
                    value={paidById}
                    onChange={(e) => setPaidById(e.target.value)}
                    className="w-full h-11 px-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#10B981]"
                  >
                    {trip.friends.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                        {f.id === trip.currentUserId ? ' (You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-1">
                    Category
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {CATEGORY_LIST.map((cat) => {
                      const active = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            active
                              ? 'bg-[#10B981] text-white'
                              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rc-date"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="rc-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              {/* Foreign Currency Conversion Strip */}
              {isForeign && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
                      className="w-24 h-8 px-2 rounded-md border border-slate-300 bg-white text-xs font-semibold tabular-nums"
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
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-[#059669] tabular-nums">
                    Converted total:{' '}
                    {formatCents(calculation.convertedHomeCents, trip.currency)}
                  </div>
                </div>
              )}

              {/* Extracted Line Items with Friend Tap Chips */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#10B981]" />
                    Line Items ({items.length}) — Tap who shared each
                  </span>
                  <div className="flex items-center gap-2">
                    {calculation.unassignedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleAssignUnassignedToAll}
                        className="text-xs font-semibold text-[#059669] hover:underline"
                      >
                        Assign unassigned to all
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="h-8 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {items.map((item) => {
                    const itemCents = parseMajorToCents(
                      item.amountStr,
                      billCurrency
                    );
                    const allSelected =
                      item.sharedByIds.length === trip.friends.length;
                    const needsTap =
                      itemCents > 0 && item.sharedByIds.length === 0;
                    const eachCents =
                      item.sharedByIds.length > 0
                        ? Math.round(itemCents / item.sharedByIds.length)
                        : 0;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition-colors space-y-2.5 ${
                          needsTap
                            ? 'border-amber-300 bg-amber-50/40'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((x) =>
                                  x.id === item.id
                                    ? { ...x, name: e.target.value }
                                    : x
                                )
                              )
                            }
                            aria-label="Item name"
                            className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50/60 focus:bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#10B981]"
                          />

                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                              {billMeta.symbol}
                            </span>
                            <input
                              type="number"
                              step={billMeta.decimals === 0 ? '1' : '0.01'}
                              min="0"
                              value={item.amountStr}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((x) =>
                                    x.id === item.id
                                      ? { ...x, amountStr: e.target.value }
                                      : x
                                  )
                                )
                              }
                              aria-label="Item price"
                              className="w-full h-9 pl-6 pr-2 rounded-lg border border-slate-200 bg-slate-50/60 focus:bg-white text-right text-sm font-bold tabular-nums text-slate-900 focus:outline-none focus:border-[#10B981]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length <= 1}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition-colors"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Friend Tap Chips */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {trip.friends.map((friend) => {
                              const active = item.sharedByIds.includes(
                                friend.id
                              );
                              return (
                                <button
                                  key={friend.id}
                                  type="button"
                                  onClick={() =>
                                    toggleFriendOnItem(item.id, friend.id)
                                  }
                                  className={`h-8 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-all ${
                                    active
                                      ? 'bg-[#10B981] border-[#10B981] text-white shadow-xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: active
                                        ? '#FFFFFF'
                                        : friend.color,
                                    }}
                                  />
                                  <span>{friend.name}</span>
                                  {active && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => toggleAllFriendsOnItem(item.id)}
                              className="h-8 px-2.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              {allSelected ? 'None' : 'Everyone'}
                            </button>
                          </div>

                          <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                            {needsTap
                              ? 'Tap who shared'
                              : `${formatCents(eachCents, billCurrency)} each`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tax & Tip */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="rc-tax"
                      className="block text-xs font-semibold text-slate-600 mb-1"
                    >
                      Tax / Service ({billCurrency})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                        {billMeta.symbol}
                      </span>
                      <input
                        id="rc-tax"
                        type="number"
                        step={billMeta.decimals === 0 ? '1' : '0.01'}
                        min="0"
                        value={taxStr}
                        onChange={(e) => setTaxStr(e.target.value)}
                        className="w-full h-10 pl-7 pr-2.5 rounded-lg border border-slate-300 bg-white text-right text-sm font-semibold tabular-nums focus:outline-none focus:border-[#10B981]"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="rc-tip"
                      className="block text-xs font-semibold text-slate-600 mb-1"
                    >
                      Tip / Gratuity ({billCurrency})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                        {billMeta.symbol}
                      </span>
                      <input
                        id="rc-tip"
                        type="number"
                        step={billMeta.decimals === 0 ? '1' : '0.01'}
                        min="0"
                        value={tipStr}
                        onChange={(e) => setTipStr(e.target.value)}
                        className="w-full h-10 pl-7 pr-2.5 rounded-lg border border-slate-300 bg-white text-right text-sm font-semibold tabular-nums focus:outline-none focus:border-[#10B981]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <span className="font-medium text-slate-600">
                    Split tax &amp; tip:
                  </span>
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-200/70">
                    <button
                      type="button"
                      onClick={() => setTaxTipMode('proportional')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        taxTipMode === 'proportional'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Proportional to items
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxTipMode('equal')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        taxTipMode === 'equal'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Equally
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Per-Person Totals Preview */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Live Split Summary</span>
                  <span className="tabular-nums">
                    Grand Total:{' '}
                    <strong className="text-slate-900">
                      {formatCents(calculation.grandTotalMinor, billCurrency)}
                    </strong>
                    {isForeign && (
                      <span className="text-[#059669] ml-1.5">
                        (≈{' '}
                        {formatCents(
                          calculation.convertedHomeCents,
                          trip.currency
                        )}
                        )
                      </span>
                    )}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {trip.friends.map((friend) => {
                    const billShare =
                      calculation.perFriendTotalMinor[friend.id] ?? 0;
                    const homeShare = calculation.homeSplits[friend.id] ?? 0;
                    return (
                      <div
                        key={friend.id}
                        className="px-4 py-2.5 flex items-center justify-between bg-white"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            friend={friend}
                            size="xs"
                            isMe={friend.id === trip.currentUserId}
                          />
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {friend.name}
                            {friend.id === trip.currentUserId ? ' (You)' : ''}
                          </span>
                        </div>
                        <div className="text-right tabular-nums">
                          <span className="text-sm font-bold text-slate-900">
                            {formatCents(billShare, billCurrency)}
                          </span>
                          {isForeign && billShare > 0 && (
                            <span className="text-xs text-slate-500 ml-1.5">
                              ({formatCents(homeShare, trip.currency)})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer for Step 2 */}
        {step === 'assign' && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
            <span className="text-xs text-slate-500 tabular-nums">
              Subtotal {formatCents(calculation.subtotalMinor, billCurrency)} +
              Tax &amp; Tip{' '}
              {formatCents(
                calculation.taxMinor + calculation.tipMinor,
                billCurrency
              )}
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBill}
                className="h-11 px-5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold inline-flex items-center gap-2 btn-primary-glow transition-colors whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                Save Shared Bill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
