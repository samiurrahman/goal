'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';

interface InterestRow {
  id: number;
  agent_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  created_at: string;
  updated_at: string;
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const InterestedUsersPage = () => {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [interests, setInterests] = useState<InterestRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // The route is gated by middleware so a missing token here means the
      // session is mid-rehydration on a slow client — fall through to the
      // loading state and let the user retry.
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/agents/interest', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) return;

        if (res.status === 403) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          toast.error('Failed to load interested users.');
          setLoading(false);
          return;
        }
        const body = (await res.json().catch(() => ({}))) as {
          interests?: InterestRow[];
        };
        setInterests(body?.interests || []);
      } catch {
        if (!cancelled) toast.error('Network error.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      <Toaster position="top-center" />

      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          Interested users
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          People who unlocked your contact details on your agent profile. Reach out with your
          latest packages.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
        </div>
      ) : forbidden ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            This page is only available to agent accounts.
          </p>
        </div>
      ) : interests.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-8 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No one has unlocked your contact details yet. As soon as a visitor clicks
            <span className="mx-1 font-medium">Show</span>on your profile, they&apos;ll appear
            here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Your packages
            </h2>
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {interests.length} lead{interests.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/40">
                <tr className="text-left">
                  <th className="px-5 py-3 font-medium text-neutral-600 dark:text-neutral-300">
                    Name
                  </th>
                  <th className="px-5 py-3 font-medium text-neutral-600 dark:text-neutral-300">
                    Mobile number
                  </th>
                  <th className="px-5 py-3 font-medium text-neutral-600 dark:text-neutral-300">
                    Email
                  </th>
                  <th className="px-5 py-3 font-medium text-neutral-600 dark:text-neutral-300">
                    Shown on
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {interests.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30"
                  >
                    <td className="px-5 py-3 text-neutral-900 dark:text-neutral-100">
                      {row.user_name?.trim() || 'User'}
                    </td>
                    <td className="px-5 py-3 text-neutral-700 dark:text-neutral-200">
                      {row.user_phone ? (
                        <a href={`tel:${row.user_phone}`} className="hover:underline">
                          {row.user_phone}
                        </a>
                      ) : (
                        <span className="text-neutral-400">Not provided</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-700 dark:text-neutral-200">
                      {row.user_email ? (
                        <a
                          href={`mailto:${row.user_email}`}
                          className="break-all hover:underline"
                        >
                          {row.user_email}
                        </a>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-500 dark:text-neutral-400">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterestedUsersPage;
