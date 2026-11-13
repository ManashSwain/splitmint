import {
  Plus,
  MapPin,
  Calendar,
  Users,
  Pencil,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Expense, Settlement, Trip } from '../../types';
import { formatCents, formatShortDate } from '../../utils/currency';
import {
  computeMemberBalances,
  computeMinimumTransfers,
} from '../../utils/ledger';
import { Avatar } from '../Avatar';

interface TripsScreenProps {
  trips: Trip[];
  activeTripId: string;
  expenses: Expense[];
  settlements: Settlement[];
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onEditTrip: (trip: Trip) => void;
  onResetDemo: () => void;
}

export function TripsScreen({
  trips,
  activeTripId,
  expenses,
  settlements,
  onSelectTrip,
  onCreateTrip,
  onEditTrip,
  onResetDemo,
}: TripsScreenProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Your Trips
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Create a trip with friends, manage travelers, or switch ledgers. All data stays in your browser.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onResetDemo}
            className="h-11 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Demo
          </button>
          <button
            type="button"
            onClick={onCreateTrip}
            className="h-11 px-5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold inline-flex items-center gap-2 btn-primary-glow transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Trip
          </button>
        </div>
      </div>

      {/* Trip Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {trips.map((trip) => {
          const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
          const tripSettlements = settlements.filter(
            (s) => s.tripId === trip.id
          );
          const totalSpendCents = tripExpenses.reduce(
            (sum, e) => sum + e.amountCents,
            0
          );
          const balances = computeMemberBalances(
            trip,
            tripExpenses,
            tripSettlements
          );
          const transfers = computeMinimumTransfers(balances);
          const myBalance =
            balances.find((b) => b.friend.id === trip.currentUserId)?.netCents ??
            0;
          const isActive = trip.id === activeTripId;

          return (
            <div
              key={trip.id}
              className={`rounded-2xl bg-white p-5 flex flex-col justify-between transition-all ${
                isActive
                  ? 'border-2 border-[#10B981] shadow-md shadow-emerald-500/5'
                  : 'card-surface hover:border-slate-300'
              }`}
            >
              <div className="space-y-4">
                {/* Top row: Title & Edit */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>
                    <h2 className="font-display text-lg font-bold text-slate-900 truncate">
                      {trip.name}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditTrip(trip)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                    aria-label={`Edit ${trip.name}`}
                    title="Edit trip & friends"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                {/* Dates & Currency metadata */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatShortDate(trip.startDate)} – {formatShortDate(trip.endDate)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{trip.currency}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {tripExpenses.length}{' '}
                    {tripExpenses.length === 1 ? 'bill' : 'bills'}
                  </span>
                </div>

                {/* Avatars */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center -space-x-2">
                    {trip.friends.slice(0, 6).map((friend) => (
                      <div
                        key={friend.id}
                        className="ring-2 ring-white rounded-full"
                      >
                        <Avatar
                          friend={friend}
                          size="sm"
                          isMe={friend.id === trip.currentUserId}
                        />
                      </div>
                    ))}
                    {trip.friends.length > 6 && (
                      <span className="w-8 h-8 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-xs font-bold text-slate-600">
                        +{trip.friends.length - 6}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-500 inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {trip.friends.length} friends
                  </span>
                </div>

                {/* Spend & Net Position */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-500 block">
                      Total Spent
                    </span>
                    <span className="font-display text-lg font-bold text-slate-900 tabular-nums">
                      {formatCents(totalSpendCents, trip.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">
                      Your Balance
                    </span>
                    <span
                      className={`font-display text-lg font-bold tabular-nums ${
                        myBalance > 0
                          ? 'text-[#059669]'
                          : myBalance < 0
                            ? 'text-[#E11D48]'
                            : 'text-slate-600'
                      }`}
                    >
                      {myBalance === 0
                        ? 'Settled'
                        : formatCents(myBalance, trip.currency, {
                            showSign: true,
                          })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 inline-flex items-center gap-1.5">
                  {transfers.length === 0 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                      <span className="text-[#059669] font-semibold">
                        All settled up
                      </span>
                    </>
                  ) : (
                    <span>
                      {transfers.length}{' '}
                      {transfers.length === 1 ? 'payment' : 'payments'} to settle
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => onSelectTrip(trip.id)}
                  className={`h-10 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isActive ? 'Open Ledger' : 'Switch Trip'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Create New Trip Card */}
        <button
          type="button"
          onClick={onCreateTrip}
          className="min-h-[240px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#10B981] hover:bg-emerald-50/30 p-6 flex flex-col items-center justify-center text-center gap-3 transition-colors group"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-[#059669] flex items-center justify-center transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <p className="font-display font-bold text-slate-900">
              Start a New Trip
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
              Add friends, choose your currency, and split shared bills together.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
