'use client';

import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { supabase } from '@/utils/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonSecondary from '@/shared/ButtonSecondary';
import { sendWhatsApp, WA_TEMPLATES } from '@/lib/whatsapp';

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

const LOADER_CARD_COUNT = 6;

const MyBookingsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [packagesById, setPackagesById] = useState<Record<number, PackageLite>>({});
  const [agentsByAuthId, setAgentsByAuthId] = useState<Record<string, AgentLite>>({});
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');
  const [cancellingBooking, setCancellingBooking] = useState<BookingRow | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
        .select(
          'id, agent_id, package_id, slug, guests, sharing, booking_mobile, total_amount, currency, status, agent_name, created_at, cancellation_reason, cancelled_by'
        )
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
      setExpandedIds(parsedBookings.length > 0 ? [parsedBookings[0].id] : []);

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

  const toggle = (id: number) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const pendingCount = useMemo(
    () => bookings.filter((item) => (item.status || '').toLowerCase() === 'pending').length,
    [bookings]
  );

  const confirmedCount = useMemo(
    () => bookings.filter((item) => (item.status || '').toLowerCase() === 'confirmed').length,
    [bookings]
  );

  const cancelledCount = useMemo(
    () => bookings.filter((item) => (item.status || '').toLowerCase() === 'cancelled').length,
    [bookings]
  );

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
      toast.error(`Failed to cancel booking: ${payload?.error || response.statusText}`);
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

  const visibleBookings = useMemo(
    () => bookings.filter((item) => (item.status || '').toLowerCase() === activeTab),
    [activeTab, bookings]
  );

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
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('cancelled')}
              className={`block !leading-none px-5 py-2.5 rounded-full text-sm sm:text-base font-medium transition focus:outline-none ${
                activeTab === 'cancelled'
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-50'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              Cancelled({cancelledCount})
            </button>
          </li>
        </ul>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: LOADER_CARD_COUNT }).map((_, index) => (
            <div
              key={`my-booking-skeleton-${index}`}
              className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 animate-pulse"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-6 w-56 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-6 w-6 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No bookings yet.</p>
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No {activeTab} bookings found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleBookings.map((booking) => {
            const pkg = booking.package_id ? packagesById[booking.package_id] : undefined;
            const guests = Array.isArray(booking.guests) ? booking.guests : [];
            const isExpanded = expandedIds.includes(booking.id);
            const status = (booking.status || 'pending').toLowerCase();
            const agentKnownAs = (agentsByAuthId[booking.agent_id]?.known_as || '').trim();

            return (
              <div
                key={booking.id}
                className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {pkg?.title || booking.slug || 'Package booking'}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Agent: {agentKnownAs || booking.agent_name || 'TBD'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass[status] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}
                    >
                      {status}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(booking.id)}
                      className="inline-flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                      aria-label={
                        isExpanded ? 'Collapse booking details' : 'Expand booking details'
                      }
                    >
                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Booking mobile</p>
                    <p className="font-medium">{booking.booking_mobile || 'TBD'}</p>
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
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t border-neutral-200 dark:border-neutral-700 pt-4">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      {pkg?.departure_city && pkg?.arrival_city
                        ? `${pkg.departure_city} - ${pkg.arrival_city}`
                        : 'Route TBD'}
                    </div>

                    {status === 'cancelled' && (
                      <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-900/10 p-3 text-sm">
                        <p className="font-medium text-red-700 dark:text-red-300">
                          Cancelled by {booking.cancelled_by === 'user' ? 'you' : 'agent'}
                        </p>
                        {booking.cancelled_by === 'agent' && booking.cancellation_reason ? (
                          <p className="mt-1 text-red-700 dark:text-red-300">
                            Reason: {booking.cancellation_reason}
                          </p>
                        ) : null}
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Travellers</p>
                      {guests.length === 0 ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          No traveller data
                        </p>
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

                    {(status === 'pending' || status === 'confirmed') && (
                      <div className="pt-1">
                        <ButtonSecondary
                          type="button"
                          onClick={() => setCancellingBooking(booking)}
                          className="!text-red-600 dark:!text-red-400 border border-red-300 dark:border-red-700"
                        >
                          Cancel Booking
                        </ButtonSecondary>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Transition appear show={cancellingBooking !== null} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={closeCancel}>
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-75"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-75"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-neutral-900 bg-opacity-50 dark:bg-opacity-80" />
            </Transition.Child>
            <span className="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-75"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-75"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
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

export default MyBookingsPage;
