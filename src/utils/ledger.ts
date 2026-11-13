import {
  CategoryId,
  Expense,
  MemberBalance,
  Settlement,
  SuggestedTransfer,
  Trip,
} from '../types';

/**
 * Distributes totalCents equally across participantIds with deterministic
 * penny-remainder allocation so the sum of shares always equals totalCents.
 */
export function computeEqualSplits(
  totalCents: number,
  participantIds: string[]
): Record<string, number> {
  const splits: Record<string, number> = {};
  if (participantIds.length === 0 || totalCents <= 0) return splits;

  const base = Math.floor(totalCents / participantIds.length);
  const remainder = totalCents - base * participantIds.length;

  participantIds.forEach((id, idx) => {
    splits[id] = base + (idx < remainder ? 1 : 0);
  });
  return splits;
}

/**
 * Distributes totalCents proportionally by arbitrary positive numeric weights
 * (used for both percentage splits and share-multiplier splits).
 */
export function computeProportionalSplits(
  totalCents: number,
  weights: Record<string, number>
): Record<string, number> {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const splits: Record<string, number> = {};
  if (entries.length === 0 || totalCents <= 0) return splits;

  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  if (totalWeight <= 0) return splits;

  // Largest-remainder (Hamilton) method so shares sum exactly to totalCents
  const raw = entries.map(([id, weight]) => {
    const exact = (totalCents * weight) / totalWeight;
    const floorVal = Math.floor(exact);
    return { id, floorVal, frac: exact - floorVal };
  });

  let allocated = 0;
  for (const item of raw) {
    splits[item.id] = item.floorVal;
    allocated += item.floorVal;
  }

  let remaining = totalCents - allocated;
  raw.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < raw.length && remaining > 0; i++) {
    splits[raw[i].id] += 1;
    remaining -= 1;
  }

  return splits;
}

export function computeMemberBalances(
  trip: Trip,
  expenses: Expense[],
  settlements: Settlement[]
): MemberBalance[] {
  const map = new Map<string, MemberBalance>();

  for (const friend of trip.friends) {
    map.set(friend.id, {
      friend,
      paidCents: 0,
      shareCents: 0,
      settledOutCents: 0,
      settledInCents: 0,
      netCents: 0,
    });
  }

  for (const exp of expenses) {
    if (exp.tripId !== trip.id) continue;
    const payer = map.get(exp.paidById);
    if (payer) {
      payer.paidCents += exp.amountCents;
    }
    for (const [memberId, share] of Object.entries(exp.splits)) {
      const participant = map.get(memberId);
      if (participant && share > 0) {
        participant.shareCents += share;
      }
    }
  }

  for (const stl of settlements) {
    if (stl.tripId !== trip.id) continue;
    const fromMember = map.get(stl.fromId);
    const toMember = map.get(stl.toId);
    if (fromMember) fromMember.settledOutCents += stl.amountCents;
    if (toMember) toMember.settledInCents += stl.amountCents;
  }

  const results: MemberBalance[] = [];
  for (const entry of map.values()) {
    // Net balance = what they paid + repayments they made - their fair share - repayments they received
    entry.netCents =
      entry.paidCents +
      entry.settledOutCents -
      entry.shareCents -
      entry.settledInCents;
    results.push(entry);
  }

  return results;
}

/**
 * Counts how many unsimplified pairwise debts exist across all bills & settlements
 * (used to show how many transactions the simplifier eliminates).
 */
export function countUnsimplifiedEdges(
  trip: Trip,
  expenses: Expense[],
  settlements: Settlement[]
): number {
  const pairwise = new Map<string, number>();

  const addEdge = (from: string, to: string, amount: number) => {
    if (from === to || amount <= 0) return;
    const [a, b] = from < to ? [from, to] : [to, from];
    const key = `${a}::${b}`;
    const signed = from < to ? amount : -amount;
    pairwise.set(key, (pairwise.get(key) ?? 0) + signed);
  };

  for (const exp of expenses) {
    if (exp.tripId !== trip.id) continue;
    for (const [memberId, share] of Object.entries(exp.splits)) {
      if (memberId !== exp.paidById && share > 0) {
        addEdge(memberId, exp.paidById, share);
      }
    }
  }

  for (const stl of settlements) {
    if (stl.tripId !== trip.id) continue;
    // Paying back reduces debt from -> to (equivalent to adding edge to -> from)
    addEdge(stl.toId, stl.fromId, stl.amountCents);
  }

  let activeEdges = 0;
  for (const val of pairwise.values()) {
    if (Math.abs(val) > 0) activeEdges += 1;
  }
  return activeEdges;
}

/**
 * Computes the fewest possible payments to settle all balances in a group.
 * First matches exact equal-magnitude debtor/creditor pairs (which guarantees
 * saving 1 transaction per matched pair), then applies greedy largest-first
 * settlement on remaining balances.
 */
export function computeMinimumTransfers(
  balances: MemberBalance[]
): SuggestedTransfer[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.netCents < 0) {
      debtors.push({ id: b.friend.id, amount: Math.abs(b.netCents) });
    } else if (b.netCents > 0) {
      creditors.push({ id: b.friend.id, amount: b.netCents });
    }
  }

  const transfers: SuggestedTransfer[] = [];

  // Phase 1: Exact 1-to-1 cancellation matches
  for (let i = debtors.length - 1; i >= 0; i--) {
    const matchIdx = creditors.findIndex(
      (c) => c.amount === debtors[i].amount && c.amount > 0
    );
    if (matchIdx !== -1) {
      transfers.push({
        fromId: debtors[i].id,
        toId: creditors[matchIdx].id,
        amountCents: debtors[i].amount,
      });
      debtors.splice(i, 1);
      creditors.splice(matchIdx, 1);
    }
  }

  // Phase 2: Greedy largest-debtor to largest-creditor
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const pay = Math.min(debtor.amount, creditor.amount);

    if (pay > 0) {
      transfers.push({
        fromId: debtor.id,
        toId: creditor.id,
        amountCents: pay,
      });
    }

    debtor.amount -= pay;
    creditor.amount -= pay;

    if (debtor.amount === 0) d++;
    if (creditor.amount === 0) c++;
  }

  return transfers;
}

export interface CategorySummary {
  category: CategoryId;
  totalCents: number;
  count: number;
  percent: number;
}

export function computeCategoryBreakdown(
  expenses: Expense[]
): CategorySummary[] {
  const categories: CategoryId[] = [
    'dining',
    'stay',
    'transit',
    'activities',
    'groceries',
    'other',
  ];
  const totals: Record<CategoryId, { totalCents: number; count: number }> = {
    dining: { totalCents: 0, count: 0 },
    stay: { totalCents: 0, count: 0 },
    transit: { totalCents: 0, count: 0 },
    activities: { totalCents: 0, count: 0 },
    groceries: { totalCents: 0, count: 0 },
    other: { totalCents: 0, count: 0 },
  };

  let grandTotal = 0;
  for (const exp of expenses) {
    totals[exp.category].totalCents += exp.amountCents;
    totals[exp.category].count += 1;
    grandTotal += exp.amountCents;
  }

  return categories
    .map((category) => ({
      category,
      totalCents: totals[category].totalCents,
      count: totals[category].count,
      percent:
        grandTotal > 0 ? (totals[category].totalCents / grandTotal) * 100 : 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.totalCents - a.totalCents);
}
