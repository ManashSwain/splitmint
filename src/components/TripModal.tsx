import React, { useState } from 'react';
import { X, Plus, Trash2, Check, UserCheck } from 'lucide-react';
import { CurrencyCode, Friend, Trip } from '../types';
import { CURRENCIES } from '../utils/currency';
import { AVATAR_COLORS } from '../data/seed';
import { Avatar } from './Avatar';

interface TripModalProps {
  existingTrip?: Trip | null;
  lockedFriendIds?: Set<string>;
  hasExistingActivity?: boolean;
  onSave: (trip: Trip, convertExistingToNewCurrency?: boolean) => void;
  onDelete?: (tripId: string) => void;
  onClose: () => void;
}

export function TripModal({
  existingTrip,
  lockedFriendIds = new Set(),
  hasExistingActivity = false,
  onSave,
  onDelete,
  onClose,
}: TripModalProps) {
  const isEditing = Boolean(existingTrip);

  const [name, setName] = useState(existingTrip?.name ?? '');
  const [destination, setDestination] = useState(existingTrip?.destination ?? '');
  const [startDate, setStartDate] = useState(
    existingTrip?.startDate ?? new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    existingTrip?.endDate ?? new Date().toISOString().slice(0, 10)
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    existingTrip?.currency ?? 'USD'
  );
  const [convertExisting, setConvertExisting] = useState(true);
  const [friends, setFriends] = useState<Friend[]>(
    existingTrip?.friends ?? [
      { id: `f_${Date.now()}_1`, name: 'Maya', color: AVATAR_COLORS[0] },
      { id: `f_${Date.now()}_2`, name: 'Alex', color: AVATAR_COLORS[1] },
    ]
  );
  const [currentUserId, setCurrentUserId] = useState<string>(
    existingTrip?.currentUserId ?? friends[0]?.id ?? ''
  );
  const [newFriendName, setNewFriendName] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleAddFriend = () => {
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    if (
      friends.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError(`"${trimmed}" is already in this trip.`);
      return;
    }
    const nextColor = AVATAR_COLORS[friends.length % AVATAR_COLORS.length];
    const newFriend: Friend = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      color: nextColor,
    };
    setFriends((prev) => [...prev, newFriend]);
    if (!currentUserId) setCurrentUserId(newFriend.id);
    setNewFriendName('');
    setError('');
  };

  const handleRemoveFriend = (id: string) => {
    if (friends.length <= 2) {
      setError('A trip needs at least 2 people to split bills.');
      return;
    }
    if (lockedFriendIds.has(id)) {
      setError('Cannot remove someone who is already part of logged bills or settlements.');
      return;
    }
    const next = friends.filter((f) => f.id !== id);
    setFriends(next);
    if (currentUserId === id && next[0]) {
      setCurrentUserId(next[0].id);
    }
    setError('');
  };

  const handleRenameFriend = (id: string, nextName: string) => {
    setFriends((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: nextName } : f))
    );
  };

  const handleCycleColor = (id: string) => {
    setFriends((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const idx = AVATAR_COLORS.indexOf(f.color);
        const nextColor = AVATAR_COLORS[(idx + 1) % AVATAR_COLORS.length];
        return { ...f, color: nextColor };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a trip name.');
      return;
    }
    const validFriends = friends
      .map((f) => ({ ...f, name: f.name.trim() }))
      .filter((f) => f.name.length > 0);
    if (validFriends.length < 2) {
      setError('Please add at least 2 friends with valid names.');
      return;
    }

    const resolvedMe = validFriends.some((f) => f.id === currentUserId)
      ? currentUserId
      : validFriends[0].id;

    onSave(
      {
        id: existingTrip?.id ?? `trip_${Date.now()}`,
        name: cleanName,
        destination: destination.trim() || 'Shared Trip',
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
        currency,
        friends: validFriends,
        currentUserId: resolvedMe,
        createdAt: existingTrip?.createdAt ?? Date.now(),
      },
      Boolean(
        existingTrip &&
          hasExistingActivity &&
          existingTrip.currency !== currency &&
          convertExisting
      )
    );
  };

  const currencyChanged =
    Boolean(existingTrip) &&
    hasExistingActivity &&
    existingTrip?.currency !== currency;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-modal-title"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2
            id="trip-modal-title"
            className="font-display text-lg font-bold text-slate-900"
          >
            {isEditing ? 'Edit Trip & Friends' : 'Create a New Trip'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="trip-name"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Trip Name
              </label>
              <input
                id="trip-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Amalfi Coast Summer"
                className="w-full h-12 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="trip-dest"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Destination
                </label>
                <input
                  id="trip-dest"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Positano, Italy"
                  className="w-full h-12 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="trip-currency"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Home Currency
                </label>
                <select
                  id="trip-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full h-12 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {currencyChanged && (
              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={convertExisting}
                  onChange={(e) => setConvertExisting(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#10B981] focus:ring-[#10B981]"
                />
                <span>
                  Convert existing bills and settlements from{' '}
                  <strong>{existingTrip?.currency}</strong> to{' '}
                  <strong>{currency}</strong> automatically.
                </span>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="trip-start"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  Start Date
                </label>
                <input
                  id="trip-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-12 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
                />
              </div>
              <div>
                <label
                  htmlFor="trip-end"
                  className="block text-sm font-semibold text-slate-700 mb-1.5"
                >
                  End Date
                </label>
                <input
                  id="trip-end"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-12 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
                />
              </div>
            </div>
          </div>

          {/* Friends Roster */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800">
                Travelers ({friends.length})
              </span>
              <span className="text-xs text-slate-500">
                Tap avatar to change color · Select &ldquo;You&rdquo;
              </span>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFriend();
                  }
                }}
                placeholder="Add friend's name..."
                className="flex-1 h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-3 focus:ring-[#10B981]/15"
              />
              <button
                type="button"
                onClick={handleAddFriend}
                className="h-11 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {friends.map((friend) => {
                const isMe = friend.id === currentUserId;
                const isLocked = lockedFriendIds.has(friend.id);
                return (
                  <div
                    key={friend.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 bg-slate-50/60"
                  >
                    <button
                      type="button"
                      onClick={() => handleCycleColor(friend.id)}
                      className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
                      title="Change avatar color"
                    >
                      <Avatar friend={friend} size="sm" isMe={isMe} />
                    </button>
                    <input
                      type="text"
                      value={friend.name}
                      onChange={(e) =>
                        handleRenameFriend(friend.id, e.target.value)
                      }
                      aria-label={`Name for ${friend.name}`}
                      className="flex-1 min-w-0 bg-transparent text-sm font-medium text-slate-900 px-1.5 py-1 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setCurrentUserId(friend.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                        isMe
                          ? 'bg-[#10B981] text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {isMe ? 'You' : 'Set as You'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(friend.id)}
                      disabled={friends.length <= 2 || isLocked}
                      title={
                        isLocked
                          ? 'Referenced in bills/settlements'
                          : friends.length <= 2
                            ? 'Minimum 2 travelers'
                            : `Remove ${friend.name}`
                      }
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-35 disabled:pointer-events-none transition-colors"
                      aria-label={`Remove ${friend.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {isEditing && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(existingTrip!.id)}
                    className="h-11 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="h-11 px-3 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="h-11 px-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Trip
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-12 px-5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-12 px-6 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 btn-primary-glow transition-colors whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                {isEditing ? 'Save Changes' : 'Create Trip'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
