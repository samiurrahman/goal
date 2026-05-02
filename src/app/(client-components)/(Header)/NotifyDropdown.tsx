'use client';

import { Popover, Transition } from '@headlessui/react';
import { FC, Fragment, useEffect, useMemo, useState } from 'react';
import Avatar from '@/shared/Avatar';
import { BellIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';

type BookingRow = {
  id: number;
  auth_user_id: string;
  agent_id: string;
  agent_name: string;
  status: string;
  created_at: string;
};

type AgentRow = {
  auth_user_id: string | null;
  slug: string | null;
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
  name: string;
  description: string;
  time: string;
  href: string;
  avatar?: string | null;
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
  const [notifications, setNotifications] = useState<NotifyItem[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const hasNotifications = useMemo(() => notifications.length > 0, [notifications.length]);

  useEffect(() => {
    let isMounted = true;

    const pushNotification = (item: NotifyItem) => {
      setNotifications((prev) => {
        const deduped = prev.filter((entry) => entry.id !== item.id);
        return [item, ...deduped].slice(0, 20);
      });
      setHasUnread(true);
    };

    const loadNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) return;

      const { data: userDetails } = await supabase
        .from('user_details')
        .select('user_type')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const isAgent = userDetails?.user_type === 'agent';

      if (isAgent) {
        const { data: selfAgent } = await supabase
          .from('agents')
          .select('slug')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        const agentSlug = (selfAgent?.slug || '').trim();

        const { data: rows } = await supabase
          .from('bookings')
          .select('id, auth_user_id, agent_id, agent_name, status, created_at')
          .eq('agent_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!isMounted) return;

        const parsedRows = (rows || []) as BookingRow[];
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

          return {
            id: `agent-${item.id}-${item.created_at}`,
            name: customerName,
            description: 'New booking received. Please review and confirm it.',
            time: formatTimeAgo(item.created_at),
            href: agentSlug ? `/bookings?agent_id=${encodeURIComponent(agentSlug)}` : '/bookings',
            avatar: null,
          } as NotifyItem;
        });

        setNotifications(mapped);
        setHasUnread(false);

        const agentChannel = supabase
          .channel(`agent-bookings-${user.id}`)
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
                name: customerName,
                description: 'New booking received. Please review and confirm it.',
                time: 'Just now',
                href: agentSlug
                  ? `/bookings?agent_id=${encodeURIComponent(agentSlug)}`
                  : '/bookings',
                avatar: null,
              });
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(agentChannel);
        };
      }

      const { data: rows } = await supabase
        .from('bookings')
        .select('id, auth_user_id, agent_id, agent_name, status, created_at')
        .eq('auth_user_id', user.id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!isMounted) return;

      const parsedRows = (rows || []) as BookingRow[];
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
        return {
          id: `user-${item.id}-${item.created_at}`,
          name: (agent?.known_as || item.agent_name || 'Your agent').trim(),
          description: 'Your booking is confirmed. Enjoy!!!',
          time: formatTimeAgo(item.created_at),
          href: '/my-bookings',
          avatar: agent?.profile_image || null,
        } as NotifyItem;
      });

      setNotifications(mapped);
      setHasUnread(false);

      const userChannel = supabase
        .channel(`user-bookings-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `auth_user_id=eq.${user.id}`,
          },
          async (payload) => {
            const previous = payload.old as BookingRow;
            const current = payload.new as BookingRow;
            if ((current.status || '').toLowerCase() !== 'confirmed') return;
            if ((previous.status || '').toLowerCase() === 'confirmed') return;

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
              id: `user-${current.id}-${current.created_at}`,
              name,
              description: 'Your booking is confirmed. Enjoy!!!',
              time: 'Just now',
              href: '/my-bookings',
              avatar,
            });
          }
        )
        .subscribe();

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
  }, []);

  return (
    <>
      <Popover className={`relative flex ${className}`}>
        {({ open }) => (
          <>
            <Popover.Button
              className={` ${
                open ? '' : 'text-opacity-90'
              } group self-center w-10 h-10 sm:w-12 sm:h-12 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full inline-flex items-center justify-center text-base font-medium hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 relative`}
              onClick={() => setHasUnread(false)}
            >
              {hasUnread && hasNotifications ? (
                <span className="w-2 h-2 bg-blue-500 absolute top-2 right-2 rounded-full"></span>
              ) : null}
              <BellIcon className="h-6 w-6" />
            </Popover.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute z-10 w-screen max-w-xs sm:max-w-sm px-4 top-full -right-28 sm:right-0 sm:px-0">
                <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="relative grid gap-8 bg-white dark:bg-neutral-800 p-7">
                    <h3 className="text-xl font-semibold">Notifications</h3>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No new notifications.
                      </p>
                    ) : (
                      notifications.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="flex p-2 pr-8 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50 relative"
                        >
                          <Avatar
                            imgUrl={item.avatar || undefined}
                            sizeClass="w-8 h-8 sm:w-12 sm:h-12"
                            userName={item.name}
                          />
                          <div className="ml-3 sm:ml-4 space-y-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                              {item.name}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {item.description}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-400">{item.time}</p>
                          </div>
                          <span className="absolute right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"></span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    </>
  );
};

export default NotifyDropdown;
