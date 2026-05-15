'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import SingleAgentAutocomplete, { AgentOption } from './SingleAgentAutocomplete';
import { useFilterUrlSync } from '@/hooks/filters/useFilterUrlSync';
import { supabase } from '@/utils/supabaseClient';
import XClearIcon from './XClearIcon';

const AGENT_PARAM = 'agent_name';

const AgentFilter = () => {
  const { searchParams, replaceParams } = useFilterUrlSync();
  const [stagedAgent, setStagedAgent] = useState<AgentOption | null>(null);
  const [hasOpened, setHasOpened] = useState(false);

  // Take the FIRST slug only — older multi-select URLs may carry a CSV.
  const urlSlug = useMemo(() => {
    const raw = searchParams.get(AGENT_PARAM) || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean)[0] ?? null;
  }, [searchParams]);

  useEffect(() => {
    if (!urlSlug) {
      setStagedAgent(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, known_as, slug')
        .eq('slug', urlSlug)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setStagedAgent(data as AgentOption);
    })();
    return () => {
      cancelled = true;
    };
  }, [urlSlug]);

  const apply = useCallback(() => {
    replaceParams((params) => {
      if (!stagedAgent) params.delete(AGENT_PARAM);
      else params.set(AGENT_PARAM, stagedAgent.slug);
    });
  }, [stagedAgent, replaceParams]);

  const clearAll = useCallback(() => {
    setStagedAgent(null);
    replaceParams((params) => params.delete(AGENT_PARAM));
  }, [replaceParams]);

  const isActive = !!urlSlug;

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            onClick={() => setHasOpened(true)}
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none
             ${open ? '!border-primary-500 ' : ''}
              ${isActive ? '!border-primary-500 bg-primary-50' : ''}
              `}
          >
            <span>Agent</span>
            {!isActive ? (
              <i className="las la-angle-down ml-2"></i>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
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
                <div className="px-5 pt-5">
                  <SingleAgentAutocomplete
                    selected={stagedAgent}
                    onChange={setStagedAgent}
                    enabled={hasOpened}
                    placeholder="Search agent..."
                  />
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      clearAll();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => {
                      apply();
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
