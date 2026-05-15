'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';

export type AgentOption = { id: string; known_as: string; slug: string };

interface Props {
  selected: AgentOption | null;
  onChange: (agent: AgentOption | null) => void;
  // Defer fetching the agent list until the user opens the input — keeps the
  // listing page snappy when this filter is never touched.
  enabled?: boolean;
  placeholder?: string;
  listClassName?: string;
}

const SingleAgentAutocomplete: React.FC<Props> = ({
  selected,
  onChange,
  enabled = true,
  placeholder = 'Search agent...',
  listClassName = 'max-h-60 overflow-y-auto',
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: agents, isLoading } = useQuery<AgentOption[], Error>({
    queryKey: ['agents', 'filter-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, known_as, slug')
        .not('slug', 'is', null)
        .not('known_as', 'is', null)
        .order('known_as', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AgentOption[];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Client-side filter — the full list is small (a few dozen rows) so a
  // round-trip per keystroke is wasted effort. Re-uses the cached list.
  const filtered = useMemo(() => {
    if (debouncedSearch.trim().length < 2) return [];
    const needle = debouncedSearch.trim().toLowerCase();
    return (agents ?? [])
      .filter((a) => a.known_as?.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [agents, debouncedSearch]);

  const pick = (agent: AgentOption) => {
    onChange(agent);
    setSearch('');
    setDebouncedSearch('');
  };

  const showHint = debouncedSearch.trim().length < 2 && !selected;
  const showLoading = isLoading && debouncedSearch.trim().length >= 2;
  const showNoMatch = !isLoading && debouncedSearch.trim().length >= 2 && filtered.length === 0;

  return (
    <div>
      {selected && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-900 px-3 py-1 text-sm">
          <span>{selected.known_as}</span>
          <button
            type="button"
            aria-label="Remove selected agent"
            onClick={() => onChange(null)}
            className="-mr-1 p-0.5 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/40"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <input
        type="text"
        placeholder={placeholder}
        aria-label="Search agent"
        autoComplete="off"
        className="mb-3 px-3 py-2 border border-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-md w-full focus:outline-none"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={listClassName}>
        {showHint && (
          <p className="text-sm text-neutral-500">Start typing an agent name to find matches.</p>
        )}
        {showLoading && <p className="text-sm text-neutral-500">Loading agents…</p>}
        {showNoMatch && (
          <p className="text-sm text-neutral-500">
            No agents match &ldquo;{debouncedSearch}&rdquo;.
          </p>
        )}
        {filtered.map((a) => {
          const isSelected = selected?.slug === a.slug;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a)}
              className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-100'
              }`}
            >
              {a.known_as}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SingleAgentAutocomplete;
