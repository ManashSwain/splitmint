import { SplitMintStore } from '../types';

export const STORAGE_KEY = 'splitmint_store_v1';

export const AVATAR_COLORS = [
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#0EA5E9', // Sky
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export function createInitialStore(): SplitMintStore {
  return {
    activeTripId: 'trip_kyoto_autumn',
    trips: [
      {
        id: 'trip_kyoto_autumn',
        name: 'Kyoto Autumn Escape',
        destination: 'Kyoto & Osaka, Japan',
        startDate: '2026-11-08',
        endDate: '2026-11-15',
        currency: 'USD',
        currentUserId: 'f_maya',
        createdAt: 1762560000000,
        friends: [
          { id: 'f_maya', name: 'Maya', color: '#10B981' },
          { id: 'f_liam', name: 'Liam', color: '#6366F1' },
          { id: 'f_sofia', name: 'Sofia', color: '#F59E0B' },
          { id: 'f_noah', name: 'Noah', color: '#0EA5E9' },
        ],
      },
      {
        id: 'trip_lisbon_sun',
        name: 'Lisbon Sun & Tiles',
        destination: 'Lisbon, Portugal',
        startDate: '2026-09-18',
        endDate: '2026-09-23',
        currency: 'EUR',
        currentUserId: 'f_maya_2',
        createdAt: 1758153600000,
        friends: [
          { id: 'f_maya_2', name: 'Maya', color: '#10B981' },
          { id: 'f_clara', name: 'Clara', color: '#EC4899' },
          { id: 'f_marcus', name: 'Marcus', color: '#8B5CF6' },
        ],
      },
    ],
    expenses: [
      {
        id: 'exp_1',
        tripId: 'trip_kyoto_autumn',
        title: 'Higashiyama Machiya Ryokan (3 Nights)',
        amountCents: 96000,
        paidById: 'f_maya',
        category: 'stay',
        date: '2026-11-08',
        splitMode: 'equal',
        splits: {
          f_maya: 24000,
          f_liam: 24000,
          f_sofia: 24000,
          f_noah: 24000,
        },
        notes: 'Traditional wooden townhouse near Kiyomizu-dera.',
        createdAt: 1762560100000,
      },
      {
        id: 'exp_2',
        tripId: 'trip_kyoto_autumn',
        title: 'Shinkansen Green Car Tickets',
        amountCents: 38400,
        paidById: 'f_liam',
        category: 'transit',
        date: '2026-11-09',
        splitMode: 'equal',
        splits: {
          f_maya: 9600,
          f_liam: 9600,
          f_sofia: 9600,
          f_noah: 9600,
        },
        notes: 'Tokyo Station to Kyoto Station round-trip passes.',
        createdAt: 1762646400000,
      },
      {
        id: 'exp_3',
        tripId: 'trip_kyoto_autumn',
        title: 'Pontocho Alley Omakase & Sake',
        amountCents: 26800,
        paidById: 'f_maya',
        category: 'dining',
        date: '2026-11-10',
        splitMode: 'exact',
        splits: {
          f_maya: 6200,
          f_liam: 7800,
          f_sofia: 5400,
          f_noah: 7400,
        },
        notes: 'Liam & Noah ordered the reserve sake flight.',
        createdAt: 1762732800000,
      },
      {
        id: 'exp_4',
        tripId: 'trip_kyoto_autumn',
        title: 'Arashiyama Bamboo & Tea Ceremony',
        amountCents: 12000,
        paidById: 'f_sofia',
        category: 'activities',
        date: '2026-11-11',
        splitMode: 'equal',
        splits: {
          f_maya: 3000,
          f_liam: 3000,
          f_sofia: 3000,
          f_noah: 3000,
        },
        createdAt: 1762819200000,
      },
      {
        id: 'exp_5',
        tripId: 'trip_kyoto_autumn',
        title: 'Nishiki Market Snacks & Matcha',
        amountCents: 6450,
        originalCurrency: 'JPY',
        originalAmountCents: 10000,
        exchangeRate: 0.00645,
        paidById: 'f_noah',
        category: 'groceries',
        date: '2026-11-11',
        splitMode: 'equal',
        splits: {
          f_maya: 2150,
          f_liam: 2150,
          f_noah: 2150,
        },
        notes: 'Sofia skipped breakfast.',
        createdAt: 1762840000000,
      },
      {
        id: 'exp_6',
        tripId: 'trip_kyoto_autumn',
        title: 'Gion Izakaya Late Dinner',
        amountCents: 14200,
        paidById: 'f_maya',
        category: 'dining',
        date: '2026-11-12',
        splitMode: 'shares',
        splits: {
          f_maya: 2840,
          f_liam: 5680,
          f_sofia: 2840,
          f_noah: 2840,
        },
        splitMeta: {
          f_maya: 1,
          f_liam: 2,
          f_sofia: 1,
          f_noah: 1,
        },
        notes: 'Liam brought a local friend along (2x share).',
        createdAt: 1762905600000,
      },
      {
        id: 'exp_7',
        tripId: 'trip_kyoto_autumn',
        title: 'ICOCA Transit Cards Top-up',
        amountCents: 8000,
        paidById: 'f_liam',
        category: 'transit',
        date: '2026-11-12',
        splitMode: 'equal',
        splits: {
          f_maya: 2000,
          f_liam: 2000,
          f_sofia: 2000,
          f_noah: 2000,
        },
        createdAt: 1762920000000,
      },
      // Lisbon Trip Expenses
      {
        id: 'exp_l1',
        tripId: 'trip_lisbon_sun',
        title: 'Alfama Loft Apartment',
        amountCents: 54000,
        paidById: 'f_clara',
        category: 'stay',
        date: '2026-09-18',
        splitMode: 'equal',
        splits: {
          f_maya_2: 18000,
          f_clara: 18000,
          f_marcus: 18000,
        },
        createdAt: 1758154000000,
      },
      {
        id: 'exp_l2',
        tripId: 'trip_lisbon_sun',
        title: 'Time Out Market Seafood Feast',
        amountCents: 13500,
        paidById: 'f_maya_2',
        category: 'dining',
        date: '2026-09-19',
        splitMode: 'equal',
        splits: {
          f_maya_2: 4500,
          f_clara: 4500,
          f_marcus: 4500,
        },
        createdAt: 1758240000000,
      },
      {
        id: 'exp_l3',
        tripId: 'trip_lisbon_sun',
        title: 'Sintra Day Train & Pena Palace',
        amountCents: 7800,
        paidById: 'f_marcus',
        category: 'activities',
        date: '2026-09-20',
        splitMode: 'equal',
        splits: {
          f_maya_2: 2600,
          f_clara: 2600,
          f_marcus: 2600,
        },
        createdAt: 1758326400000,
      },
    ],
    settlements: [
      {
        id: 'stl_1',
        tripId: 'trip_kyoto_autumn',
        fromId: 'f_noah',
        toId: 'f_maya',
        amountCents: 15000,
        date: '2026-11-11',
        note: 'Partial Venmo for Ryokan deposit',
        createdAt: 1762860000000,
      },
    ],
  };
}

export function loadStore(): SplitMintStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as SplitMintStore;
    if (!parsed || !Array.isArray(parsed.trips) || parsed.trips.length === 0) {
      const initial = createInitialStore();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    return createInitialStore();
  }
}

export function saveStore(store: SplitMintStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors cleanly
  }
}
