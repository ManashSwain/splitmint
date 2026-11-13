export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'JPY' | 'GBP' | 'CAD' | 'AUD';

export type CategoryId =
  | 'dining'
  | 'stay'
  | 'transit'
  | 'activities'
  | 'groceries'
  | 'other';

export type SplitMode = 'equal' | 'exact' | 'percentage' | 'shares';

export type AppScreen = 'trips' | 'expenses' | 'balances' | 'settle';

export interface Friend {
  id: string;
  name: string;
  color: string;
}

export interface ReceiptLineItem {
  id: string;
  name: string;
  amountCents: number;
  sharedByIds: string[];
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  /** Stored in trip home currency minor units */
  amountCents: number;
  paidById: string;
  category: CategoryId;
  date: string; // YYYY-MM-DD
  splitMode: SplitMode;
  /** Map of friendId -> exact share in trip home currency minor units */
  splits: Record<string, number>;
  /** Raw inputs for percentage (0-100) or shares (e.g. 1, 2, 0.5) when editing */
  splitMeta?: Record<string, number>;
  /** Original currency when logged in a non-home currency */
  originalCurrency?: CurrencyCode;
  /** Original amount in originalCurrency minor units */
  originalAmountCents?: number;
  /** Conversion rate applied: 1 unit of originalCurrency = exchangeRate units of trip.currency */
  exchangeRate?: number;
  /** Extracted itemized breakdown when created via Smart Receipt Capture */
  receiptItems?: ReceiptLineItem[];
  notes?: string;
  createdAt: number;
}

export interface Settlement {
  id: string;
  tripId: string;
  fromId: string;
  toId: string;
  amountCents: number;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: CurrencyCode;
  friends: Friend[];
  currentUserId: string;
  createdAt: number;
}

export interface MemberBalance {
  friend: Friend;
  paidCents: number;
  shareCents: number;
  settledOutCents: number;
  settledInCents: number;
  /** Positive = is owed money (creditor). Negative = owes money (debtor). */
  netCents: number;
}

export interface SuggestedTransfer {
  fromId: string;
  toId: string;
  amountCents: number;
}

export interface SplitMintStore {
  trips: Trip[];
  expenses: Expense[];
  settlements: Settlement[];
  activeTripId: string;
}
