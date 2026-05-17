'use client';

import React, { Fragment, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '@/utils/supabaseClient';
import toast from 'react-hot-toast';
import { showApiError } from '@/lib/apiErrors';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonSecondary from '@/shared/ButtonSecondary';
import { sendWhatsApp, WA_TEMPLATES } from '@/lib/whatsapp';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LOADER_COUNT = 5;

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
];

const avatarColor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name || 'A').slice(0, 2).toUpperCase();
};

const hoursAgo = (dateStr: string) =>
  Math.floor((Date.now() - new Date(dateStr).getTime()) / 36e5);

const timeAgo = (dateStr: string) => {
  const h = hoursAgo(dateStr);
  if (h < 1) return 'just now';
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
};

type BookingRow = {
  id: number;
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
  cancellation_reason: string | null;
  cancelled_by: 'agent' | 'user' | null;
};

const BOOKING_SELECT_COLUMNS =
  'id, agent_id, package_id, slug, guests, sharing, booking_mobile, total_amount, currency, status, agent_name, created_at, cancellation_reason, cancelled_by';

type PackageLite = {
  id: number;
  title: string | null;
  thumbnail_url: string | null;
  departure_city: string | null;
  arrival_city: string | null;
  departure_date: string | null;
  arrival_date: string | null;
};

type AgentLite = {
  auth_user_id: string;
  known_as: string | null;
  contact_number?: string | null;
};

const statusClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const TAB_LIST = ['all', 'pending', 'confirmed', 'cancelled'] as const;
type TabKey = (typeof TAB_LIST)[number];

const MyBookingsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [packagesById, setPackagesById] = useState<Record<number, PackageLite>>({});
  const [agentsByAuthId, setAgentsByAuthId] = useState<Record<string, AgentLite>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<BookingRow | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookingRow[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Sync active tab with ?tab= URL param so notification deep-links land on the right tab.
  const searchParams = useSearchParams();
  useEffect(() => {
    const t = searchParams?.get('tab');
    if (t && (TAB_LIST as readonly string[]).includes(t)) {
      setActiveTab(t as TabKey);
    }
  }, [searchParams]);

  // Realtime subscription — scoped to this user's bookings rows
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`my-bookings-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `auth_user_id=eq.${currentUserId}`,
        },
        () => setRefreshKey((k) => k + 1)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        toast.error('Please login to view your bookings.');
        setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data: bookingRows, error: bookingsError } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT_COLUMNS)
        .eq('auth_user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (bookingsError) {
        toast.error('Failed to load bookings: ' + bookingsError.message);
        setIsLoading(false);
        return;
      }

      const parsedBookings = (bookingRows || []) as BookingRow[];
      setBookings(parsedBookings);

      const agentAuthIds = Array.from(
        new Set(parsedBookings.map((item) => item.agent_id).filter(Boolean))
      );

      if (agentAuthIds.length > 0) {
        const { data: agentRows } = await supabase
          .from('agents')
          .select('auth_user_id, known_as, contact_number')
          .in('auth_user_id', agentAuthIds);

        const mappedAgents: Record<string, AgentLite> = {};
        (agentRows || []).forEach((agent: AgentLite) => {
          mappedAgents[agent.auth_user_id] = agent;
        });
        setAgentsByAuthId(mappedAgents);
      } else {
        setAgentsByAuthId({});
      }

      const packageIds = Array.from(
        new Set(parsedBookings.map((item) => item.package_id).filter((id): id is number => !!id))
      );

      if (packageIds.length > 0) {
        const { data: packageRows, error: packagesError } = await supabase
          .from('packages')
          .select(
            'id, title, thumbnail_url, departure_city, arrival_city, departure_date, arrival_date'
          )
          .in('id', packageIds);

        if (!isMounted) return;

        if (packagesError) {
          toast.error('Failed to load package details: ' + packagesError.message);
        } else {
          const mapped: Record<number, PackageLite> = {};
          (packageRows || []).forEach((pkg: PackageLite) => {
            mapped[pkg.id] = pkg;
          });
          setPackagesById(mapped);
        }
      }

      setIsLoading(false);
    };

    void loadBookings();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  useEffect(() => { setSelectedMonth(null); setSelectedBookingId(null); }, [selectedYear]);
  useEffect(() => { setSelectedBookingId(null); }, [selectedMonth]);

  const closeCancel = () => {
    if (isCancelSubmitting) return;
    setCancellingBooking(null);
  };

  const handleCancelSubmit = async () => {
    if (!cancellingBooking) return;

    setIsCancelSubmitting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (!token) {
      toast.error('Session expired. Please sign in again.');
      setIsCancelSubmitting(false);
      return;
    }

    const response = await fetch('/api/bookings/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingId: cancellingBooking.id }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      showApiError(new Error(payload?.error || response.statusText), {
        message: 'Failed to cancel booking. Please try again.',
      });
      setIsCancelSubmitting(false);
      return;
    }

    setBookings((prev) =>
      prev.map((item) =>
        item.id === cancellingBooking.id
          ? { ...item, status: 'cancelled', cancelled_by: 'user', cancellation_reason: null }
          : item
      )
    );

    const agentPhone = agentsByAuthId[cancellingBooking.agent_id]?.contact_number || '';
    sendWhatsApp(agentPhone, WA_TEMPLATES.BOOKING_CANCELLED_BY_USER, [
      cancellingBooking.slug || `Booking #${cancellingBooking.id}`,
      String(cancellingBooking.id),
    ]);

    toast.success('Booking cancelled.');
    setIsCancelSubmitting(false);
    setCancellingBooking(null);
    setActiveTab('cancelled');
  };

  // Search debounce
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const raw = debouncedQuery.replace(/^#/, '').trim();
      if (!raw || !currentUserId) { setSearchResults([]); return; }
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) { setSearchResults([]); return; }
      setIsSearchLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(BOOKING_SELECT_COLUMNS)
        .eq('auth_user_id', currentUserId)
        .eq('id', id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setSearchResults(error ? [] : (data || []) as BookingRow[]);
      setIsSearchLoading(false);
    };
    void run();
    return () => { cancelled = true; };
  }, [debouncedQuery, currentUserId]);

  // Counts scoped to the current year + month selection
  const yearMonthFiltered = useMemo(() => {
    let list = bookings.filter((b) => new Date(b.created_at).getFullYear() === selectedYear);
    if (selectedMonth !== null) {
      list = list.filter((b) => new Date(b.created_at).getMonth() === selectedMonth);
    }
    return list;
  }, [bookings, selectedYear, selectedMonth]);

  const allCount = yearMonthFiltered.length;
  const pendingCount = useMemo(() => yearMonthFiltered.filter((b) => b.status?.toLowerCase() === 'pending').length, [yearMonthFiltered]);
  const confirmedCount = useMemo(() => yearMonthFiltered.filter((b) => b.status?.toLowerCase() === 'confirmed').length, [yearMonthFiltered]);
  const cancelledCount = useMemo(() => yearMonthFiltered.filter((b) => b.status?.toLowerCase() === 'cancelled').length, [yearMonthFiltered]);

  const tabCounts: Record<TabKey, number> = { all: allCount, pending: pendingCount, confirmed: confirmedCount, cancelled: cancelledCount };

  // Year pills — always current + next, plus any years from bookings
  const allYears = useMemo(() => {
    const cy = now.getFullYear();
    const years = new Set([cy, cy + 1]);
    bookings.forEach((b) => {
      const d = new Date(b.created_at);
      if (!isNaN(d.getTime())) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [bookings]);

  // Month pills for selected year (from all bookings)
  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    bookings.forEach((b) => {
      const d = new Date(b.created_at);
      if (d.getFullYear() === selectedYear) months.add(d.getMonth());
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [bookings, selectedYear]);

  // Filtered list
  const tabFiltered = useMemo(
    () => (activeTab === 'all' ? bookings : bookings.filter((b) => b.status?.toLowerCase() === activeTab)),
    [activeTab, bookings]
  );

  const displayedBookings = useMemo(() => {
    let list = tabFiltered.filter((b) => new Date(b.created_at).getFullYear() === selectedYear);
    if (selectedMonth !== null) {
      list = list.filter((b) => new Date(b.created_at).getMonth() === selectedMonth);
    }
    return list;
  }, [tabFiltered, selectedYear, selectedMonth]);

  const isSearching = debouncedQuery.length > 0;
  const listToShow = isSearching ? searchResults : displayedBookings;

  const selectedBooking = useMemo(
    () => (selectedBookingId ? bookings.find((b) => b.id === selectedBookingId) ?? null : null),
    [selectedBookingId, bookings]
  );

  const getAgentName = (booking: BookingRow) => {
    const known = agentsByAuthId[booking.agent_id]?.known_as?.trim();
    return known || booking.agent_name || 'Agent';
  };

  const getAgentPhone = (booking: BookingRow) =>
    agentsByAuthId[booking.agent_id]?.contact_number || '';

  return (
    <div>
      {/* ─── MAIN CARD ─── */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 overflow-hidden">

        {/* ─── CARD HEADER ─── */}
        <div className="px-5 pt-5 pb-0 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            My bookings
            {allCount > 0 && (
              <span className="text-xs font-semibold bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                {allCount} total
              </span>
            )}
          </h2>
          {/* Search */}
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by booking ID…"
              className="pl-9 pr-8 py-1.5 w-48 sm:w-56 rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-neutral-900 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-600"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ─── YEAR PILLS ─── */}
        {!isLoading && allYears.length > 0 && (
          <div className="px-5 pt-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Year</span>
            <div className="flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 p-1">
              {allYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition focus:outline-none ${
                    selectedYear === year
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 shadow-sm'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── MONTH PILLS ─── */}
        {!isLoading && availableMonths.length > 0 && (
          <div className="px-5 pt-3 flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedMonth(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                selectedMonth === null
                  ? 'bg-primary-700 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              All
            </button>
            {availableMonths.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonth(m)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedMonth === m
                    ? 'bg-primary-700 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                {MONTH_SHORT[m]}
              </button>
            ))}
          </div>
        )}

        {/* ─── TABS ─── */}
        <div className="flex mt-4 px-5 overflow-x-auto hiddenScrollbar border-b border-neutral-200 dark:border-neutral-700">
          {TAB_LIST.map((tab) => {
            const count = tabCounts[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 flex items-center gap-1.5 px-1 mr-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap focus:outline-none ${
                  activeTab === tab
                    ? 'border-primary-700 text-primary-700 dark:text-primary-400 dark:border-primary-400 font-semibold'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10.5px] font-semibold rounded-full ${
                    activeTab === tab
                      ? 'bg-primary-700 text-white dark:bg-primary-600'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── BODY: split layout ─── */}
        <div className="flex divide-x divide-neutral-200 dark:divide-neutral-700 min-h-[360px]">

          {/* ── LEFT: bookings list ── */}
          <div className={`flex flex-col min-w-0 flex-none ${selectedBookingId ? 'hidden lg:flex lg:w-[55%]' : 'flex w-full'}`}>
            {isLoading ? (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {Array.from({ length: LOADER_COUNT }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-40 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-3 w-56 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isSearching && isSearchLoading ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Searching…</p>
              </div>
            ) : listToShow.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {isSearching
                    ? `No booking found for "${debouncedQuery}".`
                    : `No ${activeTab === 'all' ? '' : activeTab + ' '}bookings in ${
                        selectedMonth !== null ? `${MONTH_SHORT[selectedMonth]} ` : ''
                      }${selectedYear}.`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {listToShow.map((booking) => {
                  const agentName = getAgentName(booking);
                  const initials = getInitials(agentName);
                  const color = avatarColor(agentName);
                  const isSelected = selectedBookingId === booking.id;
                  const status = (booking.status || 'pending').toLowerCase();
                  const hrs = status === 'pending' ? hoursAgo(booking.created_at) : 0;
                  const isUrgent = status === 'pending' && hrs >= 24;
                  const guests = Array.isArray(booking.guests) ? booking.guests : [];
                  const pkg = booking.package_id ? packagesById[booking.package_id] : undefined;
                  const titleText = pkg?.title || booking.slug || 'Package booking';

                  return (
                    <div
                      key={booking.id}
                      className={`relative flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-900/10'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                      }`}
                      onClick={() => setSelectedBookingId(isSelected ? null : booking.id)}
                    >
                      {/* Yellow left highlight bar */}
                      {isSelected && (
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-yellow-400 rounded-r-sm" />
                      )}

                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-semibold ${color}`}>
                        {initials}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                            {agentName}
                          </span>
                          <span className="text-[12px] text-neutral-500 dark:text-neutral-400 font-normal truncate">
                            · {titleText}
                            {booking.sharing ? ` · ${booking.sharing} sharing` : ''}
                          </span>
                        </div>
                        <div className="text-[12px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {booking.currency || 'INR'}{' '}
                          {Number(booking.total_amount || 0).toLocaleString('en-IN')}
                          {guests.length > 0 ? ` · ${guests.length} pax` : booking.sharing ? ` · ${booking.sharing} pax` : ''}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {isUrgent ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9" /><polyline points="12 6 12 12 16 14" />
                              </svg>
                              Awaiting {Math.floor(hrs / 24)}d
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                              {timeAgo(booking.created_at)}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusClass[status] || 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                            {status}
                          </span>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBookingId(isSelected ? null : booking.id);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0 ${
                            isSelected
                              ? 'bg-primary-700 text-white'
                              : 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40'
                          }`}
                          aria-label="Open booking detail"
                        >
                          <ArrowRightIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT: detail panel ── */}
          <div className={`flex-none flex flex-col bg-white dark:bg-neutral-900 ${selectedBooking ? 'w-full lg:w-[45%]' : 'hidden'}`}>
          {selectedBooking ? (<>
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedBookingId(null)}
                  className="lg:hidden w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition flex-shrink-0"
                  aria-label="Back to list"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  {selectedBooking.agent_name && selectedBooking.slug ? (
                    <Link
                      href={`/${selectedBooking.agent_name}/${selectedBooking.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-primary-700 dark:hover:text-primary-300 truncate block"
                    >
                      {selectedBooking.package_id && packagesById[selectedBooking.package_id]?.title
                        ? packagesById[selectedBooking.package_id].title
                        : selectedBooking.slug}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {selectedBooking.slug || 'Package booking'}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    #{selectedBooking.id} · {new Date(selectedBooking.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusClass[selectedBooking.status?.toLowerCase()] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                  {selectedBooking.status}
                </span>
                {selectedBooking.status?.toLowerCase() === 'cancelled' && selectedBooking.cancelled_by === 'agent' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-900 flex-shrink-0">
                    by agent
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBookingId(null)}
                  className="hidden lg:flex w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition flex-shrink-0"
                  aria-label="Close panel"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Panel actions — Cancel for pending/confirmed */}
              {(selectedBooking.status?.toLowerCase() === 'pending' ||
                selectedBooking.status?.toLowerCase() === 'confirmed') && (
                <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-700 flex gap-3">
                  <ButtonSecondary
                    type="button"
                    onClick={() => setCancellingBooking(selectedBooking)}
                    className="flex-1 !justify-center !text-sm !text-red-600 dark:!text-red-400 border border-red-300 dark:border-red-700"
                  >
                    Cancel Booking
                  </ButtonSecondary>
                </div>
              )}

              {/* Panel body */}
              <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
                {/* Key info grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">Agent</p>
                    <p className="font-medium mt-0.5 text-neutral-900 dark:text-neutral-100">{getAgentName(selectedBooking)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">Agent Mobile</p>
                    <p className="font-medium mt-0.5 text-neutral-900 dark:text-neutral-100">
                      {getAgentPhone(selectedBooking) || 'TBD'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">Your Mobile</p>
                    <p className="font-medium mt-0.5 text-neutral-900 dark:text-neutral-100">
                      {selectedBooking.booking_mobile || 'TBD'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">Sharing</p>
                    <p className="font-medium mt-0.5 text-neutral-900 dark:text-neutral-100">{selectedBooking.sharing} person</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">Total</p>
                    <p className="font-medium mt-0.5 text-neutral-900 dark:text-neutral-100">
                      {selectedBooking.currency || 'INR'}{' '}
                      {Number(selectedBooking.total_amount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">Booked on</p>
                    <p className="font-medium mt-0.5 text-neutral-900 dark:text-neutral-100">
                      {new Date(selectedBooking.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Route */}
                {selectedBooking.package_id && packagesById[selectedBooking.package_id] && (
                  (() => {
                    const pkg = packagesById[selectedBooking.package_id!];
                    if (!pkg?.departure_city || !pkg?.arrival_city) return null;
                    return (
                      <div>
                        <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-2">Route</p>
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">
                          {pkg.departure_city} — {pkg.arrival_city}
                        </p>
                      </div>
                    );
                  })()
                )}

                {/* Travellers */}
                {Array.isArray(selectedBooking.guests) && selectedBooking.guests.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-2">Travellers</p>
                    <div className="space-y-2">
                      {(selectedBooking.guests as Array<{ title?: string; name?: string; age?: string | number }>).map((g, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm">
                          <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-semibold text-neutral-500 flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {[g.title, g.name].filter(Boolean).join(' ') || `Guest ${i + 1}`}
                          </span>
                          {g.age && (
                            <span className="text-neutral-500 dark:text-neutral-400">· Age {g.age}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancellation info */}
                {selectedBooking.status?.toLowerCase() === 'cancelled' && (
                  <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-900/10 p-3.5 text-sm">
                    <p className="font-semibold text-red-700 dark:text-red-300">
                      Cancelled by {selectedBooking.cancelled_by === 'user' ? 'you' : 'agent'}
                    </p>
                    {selectedBooking.cancelled_by === 'agent' && selectedBooking.cancellation_reason && (
                      <p className="mt-1 text-red-600 dark:text-red-400">{selectedBooking.cancellation_reason}</p>
                    )}
                  </div>
                )}
              </div>

          </>) : (
            <div className="flex-1 flex items-center justify-center bg-neutral-50/40 dark:bg-neutral-800/20">
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                Select a booking to view details
              </p>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ─── CANCEL MODAL ─── */}
      <Transition appear show={cancellingBooking !== null} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={closeCancel}>
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-75" enterFrom="opacity-0" enterTo="opacity-100"
              leave="ease-in duration-75" leaveFrom="opacity-100" leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-neutral-900 bg-opacity-50 dark:bg-opacity-80" />
            </Transition.Child>
            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-75" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-75" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-neutral-900 shadow-xl rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold">Cancel Booking</Dialog.Title>
                  <button
                    type="button"
                    onClick={closeCancel}
                    className="inline-flex items-center justify-center rounded-xl p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Are you sure you want to cancel this booking? The agent will be notified.
                </p>
                <div className="mt-6 flex gap-3 justify-end">
                  <ButtonSecondary
                    type="button"
                    onClick={closeCancel}
                    disabled={isCancelSubmitting}
                    className="!text-sm"
                  >
                    Keep Booking
                  </ButtonSecondary>
                  <ButtonPrimary
                    type="button"
                    onClick={handleCancelSubmit}
                    disabled={isCancelSubmitting}
                    className="!bg-red-600 hover:!bg-red-700 !text-sm"
                  >
                    {isCancelSubmitting ? 'Cancelling…' : 'Cancel Booking'}
                  </ButtonPrimary>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default function MyBookingsRoute() {
  return (
    <Suspense fallback={null}>
      <MyBookingsPage />
    </Suspense>
  );
}
