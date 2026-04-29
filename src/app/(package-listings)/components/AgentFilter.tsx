'use client';

import React, { Fragment, useState, useMemo } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Checkbox from '@/shared/Checkbox';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import XClearIcon from './XClearIcon';

type Agent = { id: string; known_as: string; slug: string };

const AgentFilter = () => {
  const [agentStates, setAgentStates] = useState<string[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [debouncedAgentSearch, setDebouncedAgentSearch] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useQuery<Agent[], Error>({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('id, known_as, slug');
      if (error) throw error;
      return data as Agent[];
    },
  });

  const debouncedAgentSearchUpdater = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (val: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => setDebouncedAgentSearch(val), 300);
    };
  }, []);

  const filteredAgents = useMemo(
    () =>
      agents?.filter((a) =>
        a.known_as?.toLowerCase().includes(debouncedAgentSearch.toLowerCase())
      ) ?? [],
    [agents, debouncedAgentSearch]
  );

  const handleChangeAgent = (checked: boolean, name: string) => {
    if (checked) {
      setAgentStates((prev) => [...prev, name]);
    } else {
      setAgentStates((prev) => prev.filter((i) => i !== name));
    }
  };

  const handleApplyAgent = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (agentStates.length > 0) {
      params.set('agent_name', agentStates.join(','));
    } else {
      params.delete('agent_name');
    }
    router.replace(window.location.pathname + '?' + params.toString());
  };

  const handleClearAgentFilter = () => {
    setAgentStates([]);
    setAgentSearch('');
    setDebouncedAgentSearch('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('agent_name');
    router.replace(window.location.pathname + '?' + params.toString());
  };

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none
             ${open ? '!border-primary-500 ' : ''}
              ${!!agentStates.length ? '!border-primary-500 bg-primary-50' : ''}
              `}
          >
            <span>Agent</span>
            {!agentStates.length ? (
              <i className="las la-angle-down ml-2"></i>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAgentFilter();
                }}
              >
                <XClearIcon />
              </span>
            )}
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
            <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 lg:max-w-md">
              <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 px-5 pt-6 pb-2">
                  <input
                    type="text"
                    placeholder="Search agent..."
                    aria-label="Search agent"
                    className="mb-3 px-3 py-2 border border-neutral-300 rounded-md w-full focus:outline-none focus:ring focus:border-primary-500"
                    value={agentSearch}
                    onChange={(e) => {
                      setAgentSearch(e.target.value);
                      debouncedAgentSearchUpdater(e.target.value);
                    }}
                  />
                </div>
                <div className="relative flex flex-col px-5 py-2 space-y-3 max-h-72 overflow-y-auto">
                  {agentsLoading && (
                    <div className="text-sm text-neutral-500">Loading agents...</div>
                  )}
                  {agentsError && (
                    <div className="text-sm text-red-500">
                      Error loading agents. Please try again.
                    </div>
                  )}
                  {!agentsLoading && !agentsError && filteredAgents.length === 0 && (
                    <div className="text-sm text-neutral-500">No agents found.</div>
                  )}
                  {filteredAgents.map((item) => (
                    <Checkbox
                      key={item.id}
                      name={item.known_as}
                      label={item.known_as}
                      defaultChecked={agentStates.includes(item.slug)}
                      onChange={(checked) => handleChangeAgent(checked, item.slug)}
                    />
                  ))}
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      handleClearAgentFilter();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => {
                      handleApplyAgent();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Apply
                  </ButtonPrimary>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default AgentFilter;
