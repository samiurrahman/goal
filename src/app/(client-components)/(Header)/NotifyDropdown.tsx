'use client';

import { Transition } from '@headlessui/react';
import { FC, Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Avatar from '@/shared/Avatar';
import { BellIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import useOutsideAlerter from '@/hooks/useOutsideAlerter';
import { useRouter } from 'next/navigation';
import MobileBottomSheet from '@/shared/MobileBottomSheet';

type BookingRow = {
  id: number;
  auth_user_id: string;
  agent_id: string;
  agent_name: string;
  status: string;
  created_at: string;
  readByAgent: boolean;
  readByUser: boolean;
  cancellation_reason?: string | null;
  cancelled_by?: 'agent' | 'user' | null;
};

type AgentRow = {
  auth_user_id: string | null;
  known_as: string | null;
  profile_image: string | null;
};

type UserDetailsRow = {
  auth_user_id: string;
  first_name: string | null;
  last_name: string | null;
};

type NotifyItem = {
  id: string;
  bookingId: number;
  name: string;
  description: string;
  time: string;
  href: string;
  avatar?: string | null;
  target: 'agent' | 'user';
  isRead: boolean;
};

const formatTimeAgo = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

interface Props {
  className?: string;
}

const NotifyDropdown: FC<Props> = ({ className = '' }) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotifyItem[]>([]);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasInteractedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useOutsideAlerter(containerRef, () => setOpen(false));

  const hasNotifications = useMemo(() => notifications.length > 0, [notifications.length]);
  const hasUnread = useMemo(() => notifications.some((item) => !item.isRead), [notifications]);

  const playNotificationSound = () => {
    if (typeof window === 'undefined') return;
    if (!hasInteractedRef.current) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'suspended') {
        void ctx?.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);

      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.17);
    } catch {
      // Ignore audio failures (browser policy/device restrictions)
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unlockAudio = () => {
      hasInteractedRef.current = true;
      if (audioContextRef.current?.state === 'suspended') {
        void audioContextRef.current.resume();
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const pushNotification = (item: NotifyItem) => {
      setNotifications((prev) => {
        const deduped = prev.filter((entry) => entry.id !== item.id);
        return [item, ...deduped].slice(0, 20);
      });
      playNotificationSound();
    };

    const loadNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) return;

      const { data: userDetails } = (await supabase
        .from('user_details')
        .select('user_type')
        .eq('auth_user_id', user.id)
        .maybeSingle()) as any;

      const { data: agentByAuth } = await supabase
        .from('agents')
        .select('id, auth_user_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      let hasAgentProfile = !!agentByAuth;
      if (!hasAgentProfile && user.email) {
        const { data: agentByEmail } = (await supabase
          .from('agents')
          .select('id, auth_user_id')
          .eq('email_id', user.email)
          .maybeSingle()) as any;

        // Only adopt this orphan agent row if it has no auth_user_id yet —
        // matching by email alone would mis-classify a regular user who
        // happens to share an email with an existing agent.
        if (agentByEmail && !agentByEmail.auth_user_id) {
          await (supabase.from('agents') as any)
            .update({ auth_user_id: user.id })
            .eq('id', agentByEmail.id);
          hasAgentProfile = true;
        }
      }

      // Authoritative agent classification: explicit `user_type === 'agent'`
      // OR an `agents` row that's actually linked to this auth user.
      const isAgent = userDetails?.user_type === 'agent' || hasAgentProfile;
      console.debug('[NotifyDropdown] role detection', {
        userId: user.id,
        userEmail: user.email,
        userType: userDetails?.user_type,
        hasAgentProfile,
        isAgent,
      });

      if (isAgent) {
        const { data: rows, error: rowsError } = await supabase
          .from('bookings')
          .select(
            'id, auth_user_id, agent_id, agent_name, status, created_at, readByAgent, readByUser, cancellation_reason, cancelled_by'
          )
          .eq('agent_id', user.id)
          .eq('readByAgent', false)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!isMounted) return;

        let parsedRows = (rows || []) as BookingRow[];
        if (rowsError) {
          const { data: fallbackRows } = await supabase
            .from('bookings')
            .select('id, auth_user_id, agent_id, agent_name, status, created_at')
            .eq('agent_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

          parsedRows = (
            (fallbackRows || []) as Omit<BookingRow, 'readByAgent' | 'readByUser'>[]
          ).map((item) => ({ ...item, readByAgent: false, readByUser: false }));
        }

        // Agent only cares about: new pending bookings + user-initiated
        // cancellations. Confirmations/rejections were done by the agent so
        // they don't need a self-notification.
        parsedRows = parsedRows.filter((item) => {
          const status = (item.status || '').toLowerCase();
          if (status === 'pending') return true;
          if (status === 'cancelled' && item.cancelled_by === 'user') return true;
          return false;
        });

        const userIds = Array.from(new Set(parsedRows.map((item) => item.auth_user_id)));

        let userMap: Record<string, UserDetailsRow> = {};
        if (userIds.length > 0) {
          const { data: userRows } = await supabase
            .from('user_details')
            .select('auth_user_id, first_name, last_name')
            .in('auth_user_id', userIds);

          (userRows || []).forEach((row: UserDetailsRow) => {
            userMap[row.auth_user_id] = row;
          });
        }

        const mapped = parsedRows.map((item) => {
          const customer = userMap[item.auth_user_id];
          const customerName =
            [customer?.first_name || '', customer?.last_name || ''].join(' ').trim() ||
            'A traveler';
          const isUserCancellation =
            (item.status || '').toLowerCase() === 'cancelled' && item.cancelled_by === 'user';

          return {
            id: `agent-${item.id}-${item.created_at}${isUserCancellation ? '-cancelled' : ''}`,
            bookingId: item.id,
            name: customerName,
            description: isUserCancellation
              ? `${customerName} cancelled their booking.`
              : 'New booking received. Please review and confirm it.',
            time: formatTimeAgo(item.created_at),
            href: isUserCancellation ? '/bookings?tab=cancelled' : '/bookings?tab=pending',
            avatar: null,
            target: 'agent',
            isRead: !!item.readByAgent,
          } as NotifyItem;
        });

        setNotifications(mapped);

        const agentChannel = supabase
          .channel(`notify-agent-bookings-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'bookings',
              filter: `agent_id=eq.${user.id}`,
            },
            async (payload) => {
              const booking = payload.new as BookingRow;
              console.debug('[NotifyDropdown] agent INSERT', booking);
              let customerName = 'A traveler';

              const { data: customer } = await supabase
                .from('user_details')
                .select('first_name, last_name')
                .eq('auth_user_id', booking.auth_user_id)
                .maybeSingle();

              if (customer) {
                customerName =
                  [customer.first_name || '', customer.last_name || ''].join(' ').trim() ||
                  customerName;
              }

              pushNotification({
                id: `agent-${booking.id}-${booking.created_at}`,
                bookingId: booking.id,
                name: customerName,
                description: 'New booking received. Please review and confirm it.',
                time: 'Just now',
                href: '/bookings?tab=pending',
                avatar: null,
                target: 'agent',
                isRead: false,
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'bookings',
              filter: `agent_id=eq.${user.id}`,
            },
            async (payload) => {
              const current = payload.new as BookingRow;
              console.debug('[NotifyDropdown] agent UPDATE', {
                status: current.status,
                cancelled_by: current.cancelled_by,
                readByAgent: current.readByAgent,
                full: current,
              });
              if ((current.status || '').toLowerCase() !== 'cancelled') {
                console.debug('[NotifyDropdown] agent UPDATE skipped (not cancelled)');
                return;
              }
              if (current.cancelled_by === 'agent') {
                console.debug('[NotifyDropdown] agent UPDATE skipped (agent did it themselves)');
                return;
              }
              // Don't re-fire after the agent clicks the notification (which
              // sets readByAgent: true via /api/bookings/notifications/read).
              if (current.readByAgent === true) {
                console.debug('[NotifyDropdown] agent UPDATE skipped (already read)');
                return;
              }

              let customerName = 'A traveler';
              const { data: customer } = await supabase
                .from('user_details')
                .select('first_name, last_name')
                .eq('auth_user_id', current.auth_user_id)
                .maybeSingle();
              if (customer) {
                customerName =
                  [customer.first_name || '', customer.last_name || ''].join(' ').trim() ||
                  customerName;
              }

              pushNotification({
                id: `agent-${current.id}-${current.created_at}-cancelled`,
                bookingId: current.id,
                name: customerName,
                description: `${customerName} cancelled their booking.`,
                time: 'Just now',
                href: '/bookings?tab=cancelled',
                avatar: null,
                target: 'agent',
                isRead: false,
              });
            }
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.warn('[NotifyDropdown] agent channel status:', status);
            }
          });

        return () => {
          supabase.removeChannel(agentChannel);
        };
      }

      console.debug('[NotifyDropdown] running user-side initial query for auth_user_id =', user.id);
      const { data: rows, error: rowsError } = await supabase
        .from('bookings')
        .select(
          'id, auth_user_id, agent_id, agent_name, status, created_at, readByAgent, readByUser, cancellation_reason, cancelled_by'
        )
        .eq('auth_user_id', user.id)
        .in('status', ['confirmed', 'cancelled'])
        .eq('readByUser', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!isMounted) return;

      console.debug('[NotifyDropdown] user-side initial query result', {
        error: rowsError,
        rowCount: rows?.length ?? 0,
        rows,
      });

      let parsedRows = (rows || []) as BookingRow[];
      if (rowsError) {
        const { data: fallbackRows } = await supabase
          .from('bookings')
          .select('id, auth_user_id, agent_id, agent_name, status, created_at')
          .eq('auth_user_id', user.id)
          .in('status', ['confirmed', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(20);

        parsedRows = ((fallbackRows || []) as Omit<BookingRow, 'readByAgent' | 'readByUser'>[]).map(
          (item) => ({ ...item, readByAgent: false, readByUser: false })
        );
        console.debug('[NotifyDropdown] used fallback query, rows:', parsedRows.length);
      }

      // Drop user-cancellations from the user's own notification feed (they triggered it).
      parsedRows = parsedRows.filter(
        (item) => (item.status || '').toLowerCase() !== 'cancelled' || item.cancelled_by !== 'user'
      );

      console.debug(
        '[NotifyDropdown] after filtering user-cancellations:',
        parsedRows.length,
        'rows'
      );

      const agentIds = Array.from(new Set(parsedRows.map((item) => item.agent_id).filter(Boolean)));

      let agentById: Record<string, AgentRow> = {};
      if (agentIds.length > 0) {
        const { data: agentRows } = await supabase
          .from('agents')
          .select('auth_user_id, slug, known_as, profile_image')
          .in('auth_user_id', agentIds);

        (agentRows || []).forEach((row: AgentRow) => {
          if (row.auth_user_id) {
            agentById[row.auth_user_id] = row;
          }
        });
      }

      const mapped = parsedRows.map((item) => {
        const agent = agentById[item.agent_id];
        const agentDisplayName = (agent?.known_as || item.agent_name || 'Your agent').trim();
        const isCancellation = (item.status || '').toLowerCase() === 'cancelled';
        return {
          id: `user-${item.id}-${item.created_at}${isCancellation ? '-cancelled' : ''}`,
          bookingId: item.id,
          name: agentDisplayName,
          description: isCancellation
            ? `${agentDisplayName} cancelled your booking.${item.cancellation_reason ? ` Reason: ${item.cancellation_reason}` : ''}`
            : 'Your booking is confirmed. Enjoy!!!',
          time: formatTimeAgo(item.created_at),
          href: isCancellation ? '/my-bookings?tab=cancelled' : '/my-bookings?tab=confirmed',
          avatar: agent?.profile_image || null,
          target: 'user',
          isRead: !!item.readByUser,
        } as NotifyItem;
      });

      setNotifications(mapped);

      const userChannel = supabase
        .channel(`notify-user-bookings-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `auth_user_id=eq.${user.id}`,
          },
          async (payload) => {
            const current = payload.new as BookingRow;
            console.debug('[NotifyDropdown] user UPDATE', {
              status: current.status,
              cancelled_by: current.cancelled_by,
              readByUser: current.readByUser,
              cancellation_reason: current.cancellation_reason,
              full: current,
            });
            const status = (current.status || '').toLowerCase();

            const isConfirmed = status === 'confirmed';
            // Treat any cancelled-but-not-by-user state as an agent rejection
            // so that a missing/null `cancelled_by` in the realtime payload
            // (which can happen with partial column replication) still
            // triggers the user notification.
            const isAgentCancellation = status === 'cancelled' && current.cancelled_by !== 'user';

            if (!isConfirmed && !isAgentCancellation) {
              console.debug('[NotifyDropdown] user UPDATE skipped (not relevant)');
              return;
            }

            // Skip if the user has already explicitly marked this booking as
            // read — prevents re-firing when the user clicks the bell item.
            if (current.readByUser === true) {
              console.debug('[NotifyDropdown] user UPDATE skipped (already read)');
              return;
            }

            let name = current.agent_name || 'Your agent';
            let avatar: string | null = null;

            const { data: agent } = await supabase
              .from('agents')
              .select('known_as, profile_image')
              .eq('auth_user_id', current.agent_id)
              .maybeSingle();

            if (agent?.known_as) name = agent.known_as;
            if (agent?.profile_image) avatar = agent.profile_image;

            pushNotification({
              id: `user-${current.id}-${current.created_at}${isAgentCancellation ? '-cancelled' : ''}`,
              bookingId: current.id,
              name,
              description: isAgentCancellation
                ? `${name} cancelled your booking.${current.cancellation_reason ? ` Reason: ${current.cancellation_reason}` : ''}`
                : 'Your booking is confirmed. Enjoy!!!',
              time: 'Just now',
              href: isAgentCancellation ? '/my-bookings?tab=cancelled' : '/my-bookings?tab=confirmed',
              avatar,
              target: 'user',
              isRead: !!current.readByUser,
            });
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[NotifyDropdown] user channel status:', status);
          }
        });

      return () => {
        supabase.removeChannel(userChannel);
      };
    };

    let cleanup: (() => void) | undefined;

    void (async () => {
      cleanup = await loadNotifications();
    })();

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
    // refreshKey is in deps so opening the bell catches up on any events that
    // realtime missed (e.g., transient connection drops).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleNotificationClick = async (item: NotifyItem) => {
    if (item.isRead) return true;

    setNotifications((prev) => prev.filter((entry) => entry.id !== item.id));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) return false;

      const response = await fetch('/api/bookings/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: item.bookingId, target: item.target }),
        keepalive: true,
      });

      return response.ok;
    } catch {
      // Keep optimistic UI state even if network call fails.
      return false;
    }
  };

  return (
    <>
      <div ref={containerRef} className={`relative flex ${className}`}>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => {
              const next = !value;
              // On open, bump refreshKey so we re-fetch any cancellations or
              // confirmations that the realtime channel may have missed.
              if (next) setRefreshKey((k) => k + 1);
              return next;
            });
          }}
          className={` ${
            open ? '' : 'text-opacity-90'
          } group self-center w-10 h-10 sm:w-12 sm:h-12 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full inline-flex items-center justify-center text-base font-medium hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 relative`}
        >
          {hasUnread && hasNotifications ? (
            <span className="w-2 h-2 bg-blue-500 absolute top-2 right-2 rounded-full"></span>
          ) : null}
          <BellIcon className="h-6 w-6" />
        </button>
        <Transition
          as={Fragment}
          show={open}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <div className="hidden md:block absolute z-50 w-screen max-w-sm top-full right-0">
            <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="bg-white dark:bg-neutral-800 p-7">
                <h3 className="text-lg font-medium">Notifications</h3>
                <div className="mt-3 max-h-80 overflow-y-auto overflow-x-hidden pr-3 pb-1 space-y-3">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No new notifications.
                    </p>
                  ) : (
                    notifications.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={async (event) => {
                          event.preventDefault();
                          await handleNotificationClick(item);
                          router.push(item.href);
                        }}
                        className="flex items-start gap-3 p-3 pr-10 transition duration-150 ease-in-out rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50 relative"
                      >
                        <Avatar
                          imgUrl={item.avatar || undefined}
                          sizeClass="w-8 h-8 sm:w-12 sm:h-12"
                          userName={item.name}
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                            {item.name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-400">{item.time}</p>
                        </div>
                        {!item.isRead ? (
                          <span className="absolute right-3 top-4 w-2 h-2 rounded-full bg-blue-500"></span>
                        ) : null}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      {/* Mobile bottom sheet — same content, slide-up animation */}
      <MobileBottomSheet open={open} onClose={() => setOpen(false)} title="Notifications">
        <div className="space-y-2 pt-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No new notifications.</p>
          ) : (
            notifications.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={async (event) => {
                  event.preventDefault();
                  await handleNotificationClick(item);
                  setOpen(false);
                  router.push(item.href);
                }}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 relative"
              >
                <Avatar
                  imgUrl={item.avatar || undefined}
                  sizeClass="w-9 h-9"
                  userName={item.name}
                />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                </div>
                {!item.isRead ? (
                  <span className="absolute right-3 top-4 w-2 h-2 rounded-full bg-blue-500" />
                ) : null}
              </Link>
            ))
          )}
        </div>
      </MobileBottomSheet>
    </>
  );
};

export default NotifyDropdown;
