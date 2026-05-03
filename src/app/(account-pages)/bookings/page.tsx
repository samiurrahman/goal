'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/utils/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import ButtonPrimary from '@/shared/ButtonPrimary';

type BookingRow = {
  id: number;
  auth_user_id: string;
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

const AgentBookingsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [userDetailsByAuth, setUserDetailsByAuth] = useState<Record<string, UserDetailsLite>>({});
  const [agentSlug, setAgentSlug] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [agentUserId, setAgentUserId] = useState<string | null>(null);

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

    const effectiveSlug = (resolvedAgent.slug || '').trim();
    setAgentSlug(effectiveSlug);

    const { data: bookingRows, error: bookingsError } = await supabase
      .from('bookings')
      .select(
        'id, auth_user_id, package_id, slug, guests, sharing, booking_mobile, total_amount, currency, status, agent_name, created_at'
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
    toast.success('Booking confirmed.');
  };

  const bookingCountLabel = useMemo(() => {
    const count = bookings.length;
    return `${count} booking${count === 1 ? '' : 's'}`;
  }, [bookings.length]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <Toaster position="top-center" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">Bookings</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Agent: {agentSlug || 'TBD'}
          </p>
        </div>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">{bookingCountLabel}</span>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {isLoading ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <div className="listingSection__wrap rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No bookings found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const guests = Array.isArray(booking.guests) ? booking.guests : [];
            const isExpanded = expandedIds.includes(booking.id);
            const status = (booking.status || 'pending').toLowerCase();
            const userInfo = userDetailsByAuth[booking.auth_user_id];
            const userName = [userInfo?.first_name, userInfo?.last_name]
              .filter(Boolean)
              .join(' ')
              .trim();

            return (
              <div
                key={booking.id}
                className="listingSection__wrap rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Booking #{booking.id}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Customer: {userName || booking.auth_user_id}
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

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">Booking mobile</p>
                    <p className="font-medium">
                      {booking.booking_mobile || userInfo?.phone || 'TBD'}
                    </p>
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
          })}
        </div>
      )}
    </div>
  );
};

export default AgentBookingsPage;
