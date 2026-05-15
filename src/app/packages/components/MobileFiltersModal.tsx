'use client';

import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import ButtonClose from '@/shared/ButtonClose';
import Checkbox from '@/shared/Checkbox';
import { supabase } from '@/utils/supabaseClient';
import { MONTHS_LIST } from '@/contains/contants';
import { useMultiSelectFilter } from '@/hooks/filters/useMultiSelectFilter';
import { useMultiRangeFilter, rangeId } from '@/hooks/filters/useMultiRangeFilter';
import { useFilterUrlSync } from '@/hooks/filters/useFilterUrlSync';
import SingleCityAutocomplete, { SelectedCity } from './SingleCityAutocomplete';
import SingleAgentAutocomplete, { AgentOption } from './SingleAgentAutocomplete';
import {
  DURATION_RANGES,
  PRICE_RANGES,
  DISTANCE_RANGES,
  formatDurationRangeLabel,
  formatPriceRangeLabel,
  formatDistanceRangeLabel,
} from './filterRanges';
import RangePill from './RangePill';

const CITY_PARAM = 'city';
const LEGACY_LOCATION_PARAM = 'location';
const AGENT_PARAM = 'agent_name';

interface MobileFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SectionHeader = ({
  title,
  active,
  onClear,
}: {
  title: string;
  active: boolean;
  onClear: () => void;
}) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
    {active && (
      <button
        onClick={onClear}
        className="text-xs text-primary-600 dark:text-primary-400 underline underline-offset-2 hover:text-primary-800 focus:outline-none"
      >
        Clear
      </button>
    )}
  </div>
);

const MobileFiltersModal = ({ isOpen, onClose }: MobileFiltersModalProps) => {
  // ── Shared filter hooks ──────────────────────────────────────────────────
  const { searchParams, replaceParams } = useFilterUrlSync();
  const month = useMultiSelectFilter('month');
  const duration = useMultiRangeFilter('total_duration_days');
  const price = useMultiRangeFilter('price');
  const makkahDistance = useMultiRangeFilter('makkah_hotel_distance_m');
  const madinahDistance = useMultiRangeFilter('madinah_hotel_distance_m');
  const [distanceTab, setDistanceTab] = useState<'makkah' | 'madinah'>('makkah');
  const hotelDistanceActive = makkahDistance.isActive || madinahDistance.isActive;
  const currentDistance = distanceTab === 'makkah' ? makkahDistance : madinahDistance;

  // Staged city — single-select. Hydrated from `?city=` on every open so
  // back/forward navigation and external links stay in sync.
  const [stagedCity, setStagedCity] = useState<SelectedCity | null>(null);
  const cityIsActive = !!stagedCity;
  const urlCitySlug = useMemo(() => {
    const raw = searchParams.get(CITY_PARAM) || '';
    return (
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] ?? null
    );
  }, [searchParams]);

  useEffect(() => {
    if (!isOpen) return;
    if (!urlCitySlug) {
      setStagedCity(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, slug, name, admin1_name')
        .eq('slug', urlCitySlug)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setStagedCity({
        id: Number(data.id),
        slug: String(data.slug),
        name: String(data.name),
        admin1_name: data.admin1_name as string | null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, urlCitySlug]);

  // Staged agent — single-select. Same URL hydration pattern as city.
  const [stagedAgent, setStagedAgent] = useState<AgentOption | null>(null);
  const agentIsActive = !!stagedAgent;
  const urlAgentSlug = useMemo(() => {
    const raw = searchParams.get(AGENT_PARAM) || '';
    return (
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] ?? null
    );
  }, [searchParams]);

  useEffect(() => {
    if (!isOpen) return;
    if (!urlAgentSlug) {
      setStagedAgent(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, known_as, slug')
        .eq('slug', urlAgentSlug)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setStagedAgent(data as AgentOption);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, urlAgentSlug]);

  // ── Apply / Clear all ────────────────────────────────────────────────────
  // Critical: every filter write must go through a SINGLE replaceParams so
  // they all commit to the URL atomically. Each filter's .apply() / .clear()
  // calls router.replace internally with its own URLSearchParams snapshot;
  // if we chained them sequentially in one click, every call after the first
  // would read a stale snapshot of `searchParams` (React hasn't re-rendered
  // yet) and the last router.replace would silently overwrite the rest.
  // That bug made the modal feel like "apply only writes the last filter".
  const handleApplyAll = () => {
    replaceParams((params) => {
      params.delete(LEGACY_LOCATION_PARAM);
      if (!stagedCity) params.delete(CITY_PARAM);
      else params.set(CITY_PARAM, stagedCity.slug);

      if (!stagedAgent) params.delete(AGENT_PARAM);
      else params.set(AGENT_PARAM, stagedAgent.slug);

      month.mutate(params);
      duration.mutate(params);
      price.mutate(params);
      makkahDistance.mutate(params);
      madinahDistance.mutate(params);
    });
    onClose();
  };

  const handleClearAll = () => {
    setStagedCity(null);
    setStagedAgent(null);
    // Same batching reasoning as handleApplyAll — every clear in one call.
    replaceParams((params) => {
      params.delete(CITY_PARAM);
      params.delete(LEGACY_LOCATION_PARAM);
      params.delete(AGENT_PARAM);
      params.delete('month');
      params.delete('total_duration_days');
      params.delete('price');
      params.delete('makkah_hotel_distance_m');
      params.delete('madinah_hotel_distance_m');
    });
    // Local hook state still needs to reset its in-memory selection so the
    // controls flip off visually on the next open. The URL write above is
    // the source of truth; these calls won't race because they're internal
    // setState (no router involvement).
    month.setSelected([]);
    duration.setSelected([]);
    price.setSelected([]);
    makkahDistance.setSelected([]);
    madinahDistance.setSelected([]);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      {/* `overflow-hidden` (not -y-auto) keeps the whole dialog pinned to the
          viewport — the footer was scrolling off on small phones because the
          dialog itself was the scrollable container. Now scrolling happens
          inside the body section, so the footer stays visible on every device.
          `h-[100dvh]` instead of `h-screen` respects the mobile URL bar so the
          modal is never taller than the actual visible viewport. */}
      <Dialog as="div" className="fixed inset-0 z-50 overflow-hidden" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed inset-0 z-0 bg-black bg-opacity-40 dark:bg-opacity-60" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 flex items-stretch justify-center p-2 sm:p-4 pointer-events-none">
          {/* Modal panel */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="relative w-full max-w-4xl h-[100dvh] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] pointer-events-auto">
              <div className="flex flex-col w-full h-full text-left overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 dark:text-neutral-100 shadow-xl">
                {/* Header */}
                <div className="relative flex-shrink-0 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 text-center">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-gray-900 dark:text-neutral-100"
                  >
                    Filters
                  </Dialog.Title>
                  <span className="absolute left-3 top-3">
                    <ButtonClose onClick={onClose} />
                  </span>
                </div>

                {/* Body */}
                <div className="flex-grow overflow-y-auto">
                  <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-x-8 divide-y divide-neutral-200 dark:divide-neutral-800 sm:divide-y-0">
                    {/* Location */}
                    <section className="py-5 pt-0 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Location"
                        active={cityIsActive}
                        onClear={() => setStagedCity(null)}
                      />
                      <SingleCityAutocomplete
                        selected={stagedCity}
                        onChange={setStagedCity}
                        listClassName="max-h-44 overflow-y-auto pr-1"
                        placeholder="Search city..."
                      />
                    </section>

                    {/* Agent */}
                    <section className="py-5 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Agent"
                        active={agentIsActive}
                        onClear={() => setStagedAgent(null)}
                      />
                      <SingleAgentAutocomplete
                        selected={stagedAgent}
                        onChange={setStagedAgent}
                        enabled={isOpen}
                        listClassName="max-h-44 overflow-y-auto pr-1"
                        placeholder="Search agent..."
                      />
                    </section>

                    {/* Month */}
                    <section className="py-5 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Month"
                        active={month.isActive}
                        onClear={() => month.clear()}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {MONTHS_LIST.map((m) => (
                          <Checkbox
                            key={m}
                            name={m}
                            label={m}
                            defaultChecked={month.selected.includes(m)}
                            onChange={(checked) => month.toggle(checked, m)}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Package Duration */}
                    <section className="py-5 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Package Duration"
                        active={duration.isActive}
                        onClear={() => duration.setSelected([])}
                      />
                      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {DURATION_RANGES.map((range) => {
                          const id = rangeId(range);
                          const selected = duration.isSelected(range);
                          return (
                            <RangePill
                              key={id}
                              label={formatDurationRangeLabel(range)}
                              selected={selected}
                              onClick={() => duration.toggle(!selected, range)}
                            />
                          );
                        })}
                      </div>
                    </section>

                    {/* Price */}
                    <section className="py-5 sm:py-4">
                      <SectionHeader
                        title="Price per person"
                        active={price.isActive}
                        onClear={() => price.setSelected([])}
                      />
                      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {PRICE_RANGES.map((range) => {
                          const id = rangeId(range);
                          const selected = price.isSelected(range);
                          return (
                            <RangePill
                              key={id}
                              label={formatPriceRangeLabel(range)}
                              selected={selected}
                              onClick={() => price.toggle(!selected, range)}
                            />
                          );
                        })}
                      </div>
                    </section>

                    {/* Hotel Distance */}
                    <section className="py-5 sm:py-4 sm:col-span-2 sm:border-t sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Hotel Distance"
                        active={hotelDistanceActive}
                        onClear={() => {
                          makkahDistance.setSelected([]);
                          madinahDistance.setSelected([]);
                        }}
                      />
                      <div className="mb-3 flex justify-center">
                        <div className="inline-flex rounded-full border border-neutral-200 dark:border-neutral-700 p-1">
                          {(['makkah', 'madinah'] as const).map((tab) => {
                            const label = tab === 'makkah' ? 'Makkah' : 'Madinah';
                            const count =
                              tab === 'makkah' ? makkahDistance.count : madinahDistance.count;
                            const selected = distanceTab === tab;
                            return (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => setDistanceTab(tab)}
                                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-full focus:outline-none transition-colors ${
                                  selected
                                    ? 'bg-primary-50 text-primary-700 border border-primary-500'
                                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                              >
                                <span>{label}</span>
                                {count > 0 && (
                                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-primary-500 text-white">
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {DISTANCE_RANGES.map((range) => {
                          const id = rangeId(range);
                          const selected = currentDistance.isSelected(range);
                          return (
                            <RangePill
                              key={`${distanceTab}-${id}`}
                              label={formatDistanceRangeLabel(range)}
                              selected={selected}
                              onClick={() => currentDistance.toggle(!selected, range)}
                            />
                          );
                        })}
                      </div>
                    </section>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between gap-3">
                  <ButtonThird onClick={handleClearAll} sizeClass="px-5 py-2.5">
                    Clear all
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={handleApplyAll}
                    sizeClass="px-6 py-2.5 flex-1 sm:flex-none"
                  >
                    Apply filters
                  </ButtonPrimary>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MobileFiltersModal;
