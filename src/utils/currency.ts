import { CurrencyCode } from '../types';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
  /** Value of 1 major unit of this currency in USD (approximate reference rate) */
  usdPerUnit: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimals: 2,
    usdPerUnit: 1 / 84.5,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    usdPerUnit: 1,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    usdPerUnit: 1.08,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimals: 0,
    usdPerUnit: 1 / 154,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    usdPerUnit: 1.27,
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimals: 2,
    usdPerUnit: 1 / 1.39,
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimals: 2,
    usdPerUnit: 1 / 1.53,
  },
};

export const PRIMARY_CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'JPY'];

export function getCurrencyMeta(code: CurrencyCode): CurrencyMeta {
  return CURRENCIES[code] ?? CURRENCIES.USD;
}

/**
 * Returns default conversion rate: how many major units of `to` equal 1 major unit of `from`.
 */
export function getDefaultExchangeRate(
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return 1;
  const fromMeta = getCurrencyMeta(from);
  const toMeta = getCurrencyMeta(to);
  const raw = fromMeta.usdPerUnit / toMeta.usdPerUnit;
  // Keep clean readable precision depending on magnitude
  if (raw >= 10) return Number(raw.toFixed(2));
  if (raw >= 0.1) return Number(raw.toFixed(4));
  return Number(raw.toFixed(6));
}

/**
 * Converts minor units of `from` currency into minor units of `to` currency
 * using a major-unit exchange rate (1 major `from` = `rate` major `to`).
 */
export function convertMinorUnits(
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number
): number {
  if (from === to) return Math.round(amountMinor);
  const fromMeta = getCurrencyMeta(from);
  const toMeta = getCurrencyMeta(to);
  const fromDivisor = fromMeta.decimals === 0 ? 1 : 100;
  const toMultiplier = toMeta.decimals === 0 ? 1 : 100;
  const majorFrom = amountMinor / fromDivisor;
  const majorTo = majorFrom * rate;
  return Math.round(majorTo * toMultiplier);
}

export function formatCents(
  cents: number,
  currency: CurrencyCode,
  options?: { showSign?: boolean; compact?: boolean }
): string {
  const meta = getCurrencyMeta(currency);
  const absCents = Math.abs(Math.round(cents));
  const divisor = meta.decimals === 0 ? 1 : 100;
  const major = absCents / divisor;

  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(major);

  const prefix =
    cents < 0 ? '-' : options?.showSign && cents > 0 ? '+' : '';

  return `${prefix}${meta.symbol}${formattedNumber}`;
}

export function parseMajorToCents(input: string, currency: CurrencyCode): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  const meta = getCurrencyMeta(currency);
  const multiplier = meta.decimals === 0 ? 1 : 100;
  return Math.round(parsed * multiplier);
}

export function centsToInputString(cents: number, currency: CurrencyCode): string {
  const meta = getCurrencyMeta(currency);
  if (meta.decimals === 0) {
    return String(Math.round(cents));
  }
  return (cents / 100).toFixed(2);
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
