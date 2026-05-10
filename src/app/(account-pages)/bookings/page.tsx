'use client';

import React, { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { supabase } from '@/utils/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import ButtonPrimary from '@/shared/ButtonPrimary';

const formatBookingRef = (id: number) => `#${id}`;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const monthKey = (year: number, month: number) => `${year}-${month}`;

/** Group bookings into a year → month → bookings tree using `created_at`. */
const groupByYearMonth = (rows: { id: number; created_at: string }[]) => {
  const tree = new Map<number, Map<number, number[]>>();
  for (const row of rows) {
    const d = new Date(row.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!tree.has(y)) tree.set(y, new Map());
    const months = tree.get(y)!;
    if (!months.has(m)) months.set(m, []);
    months.get(m)!.push(row.id);
  }
  return tree;
};

type BookingRow = {
  id: number;
  auth_user_id: string;
  agent_id: string;
  package_id: number | null;
  slug: string;
  guests: Array<{ title?: string; name?: string; age?: string | number; mobile?: string }> | null;
  sharing: number;
  booking_mobile: string | null;
  total_amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | string;
  agent_name: string;
  created_at: string;
};

type UserDetailsLite = {
  auth_user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

type AgentRow = {
  id: number;
  slug: string | null;
  auth_user_id: string | null;
  email_id: string | null;
};

const statusClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const LOADER_CARD_COUNT = 6;

const AgentBookingsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [userDetailsByAuth, setUserDetailsByAuth] = useState<Record<string, UserDetailsLite>>({});
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed'>('pending');
  const [refreshKey, setRefreshKey] = useState(0);
  const [agentUserId, setAgentUserId] = useState<string | null>(null);

  // Search (DB-driven) state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookingRow[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Year selector + collapsible months for the selected year
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set([monthKey(now.getFullYear(), now.getMonth())])
  );

  const toggleMonth = (year: number, month: number) => {
    setExpandedMonths((prev) => {
      const k = monthKey(year, month);
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  // Realtime subscription — scoped to this agent's bookings rows
  useEffect(() => {
    if (!agentUserId) return;
    const channel = supabase
      .channel(`agent-bookings-${agentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `agent_id=eq.${agentUserId}` },
        () => setRefreshKey((k) => k + 1)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [agentUserId]);

  const loadBookings = async () => {
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Please login as an agent to view bookings.');
      setIsLoading(false);
      return;
    }

    const { data: agentByAuth, error: agentAuthError } = await supabase
      .from('agents')
      .select('id, slug, auth_user_id, email_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (agentAuthError) {
      toast.error('Failed to verify agent profile: ' + agentAuthError.message);
      setIsLoading(false);
      return;
    }

    let resolvedAgent = agentByAuth as AgentRow | null;

    if (!resolvedAgent && user.email) {
      const { data: agentByEmail, error: agentEmailError } = await supabase
        .from('agents')
        .select('id, slug, auth_user_id, email_id')
        .eq('email_id', user.email)
        .maybeSingle();

      if (agentEmailError) {
        toast.error('Failed to verify agent by email: ' + agentEmailError.message);
        setIsLoading(false);
        return;
      }

      if (agentByEmail) {
        resolvedAgent = agentByEmail as AgentRow;
        if (!agentByEmail.auth_user_id) {
          await supabase.from('agents').update({ auth_user_id: user.id }).eq('id', agentByEmail.id);
        }
      }
    }

    if (!resolvedAgent) {
      toast.error('Only agents can access bookings.');
      setIsLoading(false);
      return;
    }

    setAgentUserId(user.id);

    const { data: bookingRows, error: bookingsError } = await supabase
      .from('bookings')
      .select(
        'id, auth_user_id, agent_id, package_id, slug, guests, sharing, booking_mobile, total_amount, currency, status, agent_name, created_at'
      )
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      toast.error('Failed to load agent bookings: ' + bookingsError.message);
      setIsLoading(false);
      return;
    }

    const parsed = (bookingRows || []) as BookingRow[];
    setBookings(parsed);
    setExpandedIds(parsed.length > 0 ? [parsed[0].id] : []);

    const authUserIds = Array.from(
      new Set(parsed.map((item) => item.auth_user_id).filter(Boolean))
    );

    if (authUserIds.length > 0) {
      const { data: userRows, error: userError } = await supabase
        .from('user_details')
        .select('auth_user_id, first_name, last_name, phone')
        .in('auth_user_id', authUserIds);

      if (userError) {
        toast.error('Failed to load traveler owner details: ' + userError.message);
      } else {
        const mapped: Record<string, UserDetailsLite> = {};
        (userRows || []).forEach((item: UserDetailsLite) => {
          mapped[item.auth_user_id] = item;
        });
        setUserDetailsByAuth(mapped);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const toggle = (id: number) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleConfirm = async (bookingId: number) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    if (error) {
      toast.error('Failed to confirm booking: ' + error.message);
      return;
    }

    setBookings((prev) =>
      prev.map((item) => (item.id === bookingId ? { ...item, status: 'confirmed' } : item))
    );

    // Auto-open the next pending booking (in display order — newest first).
    // Also switch year and expand month so the row is actually visible.
    const idx = bookings.findIndex((b) => b.id === bookingId);
    let nextPending: BookingRow | undefined;
    if (idx !== -1) {
      for (let i = idx + 1; i < bookings.length; i++) {
        if ((bookings[i].status || '').toLowerCase() === 'pending') {
          nextPending = bookings[i];
          break;
        }
      }
      if (!nextPending) {
        for (let i = 0; i < idx; i++) {
          if ((bookings[i].status || '').toLowerCase() === 'pending') {
            nextPending = bookings[i];
            break;
          }
        }
      }
    }

    if (nextPending) {
      const d = new Date(nextPending.created_at);
      const nextYear = d.getFullYear();
      const nextMonth = d.getMonth();
      setSelectedYear(nextYear);
      setExpandedMonths((prev) => {
        const next = new Set(prev);
        next.add(monthKey(nextYear, nextMonth));
        return next;
      });
    }

    setExpandedIds((prev) => {
      const without = prev.filter((x) => x !== bookingId);
      if (nextPending && !without.includes(nextPending.id)) {
        return [...without, nextPending.id];
      }
      return without;
    });

    toast.success('Booking confirmed.');
  };

  const pendingCount = useMemo(
    () => bookings.filter((item) => (item.status || '').toLowerCase() === 'pending').length,
    [bookings]
  );

  const confirmedCount = useMemo(
    () => bookings.filter((item) => (item.status || '').toLowerCase() === 'confirmed').length,
    [bookings]
  );

  // Debounce search input → DB query
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const raw = debouncedQuery.replace(/^#/, '').trim();
      if (!raw || !agentUserId) {
        setSearchResults([]);
        return;
      }
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) {
        // Non-numeric input — no results (booking IDs are numeric)
        setSearchResults([]);
        return;
      }
      setIsSearchLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, auth_user_id, agent_id, package_id, slug, guests, sharing, booking_mobile, total_amount, currency, status, agent_name, created_at'
        )
        .eq('agent_id', agentUserId)
        .eq('id', id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error('Booking search failed:', error.message);
        setSearchResults([]);
      } else {
        setSearchResults((data || []) as BookingRow[]);
      }
      setIsSearchLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, agentUserId]);

  const isSearching = debouncedQuery.length > 0;

  const tabFilteredBookings = useMemo(
    () => bookings.filter((item) => (item.status || '').toLowerCase() === activeTab),
    [activeTab, bookings]
  );

  const groupedTree = useMemo(() => groupByYearMonth(tabFilteredBookings), [tabFilteredBookings]);
  const sortedYears = useMemo(
    () => Array.from(groupedTree.keys()).sort((a, b) => b - a),
    [groupedTree]
  );

  // Counts per year, for the dropdown labels
  const countByYear = useMemo(() => {
    const counts = new Map<number, number>();
    for (const [year, months] of groupedTree.entries()) {
      let total = 0;
      months.forEach((ids) => (total += ids.length));
      counts.set(year, total);
    }
    return counts;
  }, [groupedTree]);

  // If the currently selected year has no bookings under this tab, fall back
  // to the most recent year that does.
  useEffect(() => {
    if (sortedYears.length === 0) return;
    if (!sortedYears.includes(selectedYear)) {
      setSelectedYear(sortedYears[0]);
    }
  }, [sortedYears, selectedYear]);

  const monthsForSelectedYear = groupedTree.get(selectedYear);
  const sortedMonthsForYear = useMemo(
    () =>
      monthsForSelectedYear ? Array.from(monthsForSelectedYear.keys()).sort((a, b) => b - a) : [],
    [monthsForSelectedYear]
  );

  const bookingById = useMemo(() => {
    const m = new Map<number, BookingRow>();
    for (const b of tabFilteredBookings) m.set(b.id, b);
    return m;
  }, [tabFilteredBookings]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 p-1">
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`block !leading-none px-5 py-2.5 rounded-full text-sm sm:text-base font-medium transition focus:outline-none ${
                activeTab === 'pending'
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-50'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              Pending({pendingCount})
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('confirmed')}
              className={`block !leading-none px-5 py-2.5 rounded-full text-sm sm:text-base font-medium transition focus:outline-none ${
                activeTab === 'confirmed'
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-50'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              Confirmed({confirmedCount})
            </button>
          </li>
        </ul>
      </div>

      {/* Booking ID search */}
      <div className="relative max-w-md">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
          <MagnifyingGlassIcon className="w-5 h-5" />
        </span>
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Booking ID (e.g. 29)"
          className="w-full pl-10 pr-10 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          aria-label="Search bookings by ID"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            aria-label="Clear search"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: LOADER_CARD_COUNT }).map((_, index) => (
            <div
              key={`agent-booking-skeleton-${index}`}
              className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 animate-pulse"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-6 w-56 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-4 w-36 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-6 w-6 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
            </div>
          ))}
        </div>
      ) : isSearching ? (
        // Search results — flat list, ignores tabs
        isSearchLoading ? (
          <div className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Searching…</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No booking found for &quot;{debouncedQuery}&quot;.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {searchResults.map((booking) => renderBookingCard(booking))}
          </div>
        )
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No bookings found.</p>
        </div>
      ) : tabFilteredBookings.length === 0 ? (
        <div className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No {activeTab} bookings found.
          </p>
        </div>
      ) : (
        // Grouped view: year selector dropdown → month accordions → bookings
        <div className="space-y-4">
          {/* Year selector */}
          <div className="flex items-center justify-between gap-3">
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:border-primary-500 hover:text-primary-700 dark:hover:text-primary-300 focus:outline-none transition-colors">
                <CalendarDaysIcon className="w-4 h-4" />
                <span className="hidden sm:inline text-neutral-500 dark:text-neutral-400">
                  Year:
                </span>
                <span className="font-medium">{selectedYear}</span>
                <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Menu.Items className="absolute left-0 z-20 mt-2 w-56 origin-top-left rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none overflow-hidden">
                  <div className="py-2">
                    {sortedYears.map((year) => {
                      const isActive = year === selectedYear;
                      const total = countByYear.get(year) ?? 0;
                      return (
                        <Menu.Item key={year}>
                          {({ active }) => (
                            <button
                              type="button"
                              onClick={() => setSelectedYear(year)}
                              className={`w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition ${
                                active ? 'bg-neutral-100 dark:bg-neutral-800' : ''
                              } ${
                                isActive
                                  ? 'text-primary-700 dark:text-primary-300 font-medium'
                                  : 'text-neutral-700 dark:text-neutral-200'
                              }`}
                            >
                              <span>{year}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {total}
                                </span>
                                {isActive ? <CheckIcon className="w-4 h-4" /> : null}
                              </span>
                            </button>
                          )}
                        </Menu.Item>
                      );
                    })}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {countByYear.get(selectedYear) ?? 0} booking
              {(countByYear.get(selectedYear) ?? 0) === 1 ? '' : 's'} in {selectedYear}
            </span>
          </div>

          {/* Months for selected year */}
          {sortedMonthsForYear.length === 0 ? (
            <div className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No {activeTab} bookings in {selectedYear}.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-800">
              {sortedMonthsForYear.map((month) => {
                const ids = monthsForSelectedYear?.get(month) || [];
                const isMonthOpen = expandedMonths.has(monthKey(selectedYear, month));
                return (
                  <div key={`${selectedYear}-${month}`}>
                    <button
                      type="button"
                      onClick={() => toggleMonth(selectedYear, month)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60 focus:outline-none"
                      aria-expanded={isMonthOpen}
                    >
                      <div className="flex items-center gap-3">
                        {isMonthOpen ? (
                          <ChevronUpIcon className="w-5 h-5 text-neutral-500" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-neutral-500" />
                        )}
                        <span className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                          {MONTH_NAMES[month]}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        {ids.length} booking{ids.length === 1 ? '' : 's'}
                      </span>
                    </button>
                    {isMonthOpen && (
                      <div className="px-3 sm:px-4 pb-4 pt-1 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/40">
                        {ids
                          .map((id) => bookingById.get(id))
                          .filter((b): b is BookingRow => !!b)
                          .map((booking) => renderBookingCard(booking))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  function renderBookingCard(booking: BookingRow) {
    const guests = Array.isArray(booking.guests) ? booking.guests : [];
    const isExpanded = expandedIds.includes(booking.id);
    const status = (booking.status || 'pending').toLowerCase();
    const userInfo = userDetailsByAuth[booking.auth_user_id];
    const userName = [userInfo?.first_name, userInfo?.last_name].filter(Boolean).join(' ').trim();
    const firstGuestName = guests.find((guest) => (guest?.name || '').trim())?.name?.trim() || '';
    const bookedByUserName = userName || firstGuestName || 'User';

    return (
      <div
        key={booking.id}
        className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            {booking.agent_name && booking.slug ? (
              <Link
                href={`/${booking.agent_name}/${booking.slug}`}
                className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 hover:underline hover:text-primary-700 dark:hover:text-primary-300 truncate block"
                target="_blank"
                rel="noopener noreferrer"
              >
                {booking.slug}
              </Link>
            ) : (
              <h3 className="text-lg font-semibold truncate">
                {booking.slug || 'Package booking'}
              </h3>
            )}
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>User: {bookedByUserName}</span>
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-600">
                ·
              </span>
              <span className="font-mono text-xs">{formatBookingRef(booking.id)}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass[status] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}
            >
              {status}
            </span>
            <button
              type="button"
              onClick={() => toggle(booking.id)}
              className="inline-flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              aria-label={isExpanded ? 'Collapse booking details' : 'Expand booking details'}
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-neutral-500 dark:text-neutral-400">User name</p>
            <p className="font-medium">{bookedByUserName}</p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-neutral-400">Booking mobile</p>
            <p className="font-medium">{booking.booking_mobile || userInfo?.phone || 'TBD'}</p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-neutral-400">Sharing</p>
            <p className="font-medium">{booking.sharing} person</p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-neutral-400">Total</p>
            <p className="font-medium">
              {booking.currency} {Number(booking.total_amount || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-neutral-400">Booked on</p>
            <p className="font-medium">
              {new Date(booking.created_at).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Travellers</p>
              {guests.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No traveller data</p>
              ) : (
                guests.map((guest, index) => (
                  <div
                    key={`${booking.id}-guest-${index}`}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3 text-sm"
                  >
                    <p className="font-medium">
                      {guest.title || ''} {guest.name || `Guest ${index + 1}`}
                    </p>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Age: {guest.age || 'TBD'}
                    </p>
                  </div>
                ))
              )}
            </div>

            {status !== 'confirmed' && (
              <div className="pt-1">
                <ButtonPrimary type="button" onClick={() => handleConfirm(booking.id)}>
                  Confirm Booking
                </ButtonPrimary>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
};

export default AgentBookingsPage;
