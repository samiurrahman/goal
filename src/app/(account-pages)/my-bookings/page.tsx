'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/utils/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';

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
};

const statusClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const MyBookingsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [packagesById, setPackagesById] = useState<Record<number, PackageLite>>({});
  const [agentsByAuthId, setAgentsByAuthId] = useState<Record<string, AgentLite>>({});
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed'>('pending');
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
          'id, agent_id, package_id, slug, guests, sharing, booking_mobile, total_amount, currency, status, agent_name, created_at'
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
          .select('auth_user_id, known_as')
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

  const visibleBookings = useMemo(
    () => bookings.filter((item) => (item.status || '').toLowerCase() === activeTab),
    [activeTab, bookings]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex items-center space-x-3 sm:space-x-5 overflow-x-auto hiddenScrollbar">
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2.5 rounded-full text-sm sm:text-base font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-secondary-900 text-secondary-50'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              Pending({pendingCount})
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('confirmed')}
              className={`px-5 py-2.5 rounded-full text-sm sm:text-base font-medium transition-colors ${
                activeTab === 'confirmed'
                  ? 'bg-secondary-900 text-secondary-50'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              Confirmed({confirmedCount})
            </button>
          </li>
        </ul>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <div className="listingSection__wrap rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No bookings yet.</p>
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="listingSection__wrap rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
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
                className="listingSection__wrap rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5"
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

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
