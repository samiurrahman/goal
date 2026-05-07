'use client';

import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import ButtonClose from '@/shared/ButtonClose';
import Checkbox from '@/shared/Checkbox';
import Slider from 'rc-slider';
import { useCities } from '@/hooks/useCities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { MONTHS_LIST } from '@/contains/contants';
import { useMultiSelectFilter } from '@/hooks/filters/useMultiSelectFilter';
import { useSingleValueFilter } from '@/hooks/filters/useSingleValueFilter';
import { useHotelDistanceFilter } from '@/hooks/filters/useHotelDistanceFilter';

type City = { id: string; name: string; state?: string | null };
type Agent = { id: string; known_as: string; slug: string };

const PRICE_MAX = 300000;
const DURATION_MAX = 60;
const DISTANCE_MAX = 5000;

function formatDistance(val: number) {
  if (val < 1000) return `${val} m`;
  const km = Math.floor(val / 1000);
  const m = val % 1000;
  return `${km} km${m > 0 ? ` ${m} m` : ''}`;
}

function formatIndianPrice(val: number) {
  if (val < 100000) return `${Math.round(val / 1000)}K`;
  const lakhs = Math.floor(val / 100000);
  const thousands = Math.round((val % 100000) / 1000);
  return `${lakhs} Lakh${thousands > 0 ? ` ${thousands}K` : ''}`;
}

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
  const location = useMultiSelectFilter('location');
  const agent = useMultiSelectFilter('agent_name');
  const month = useMultiSelectFilter('month');
  const duration = useSingleValueFilter('total_duration_days', DURATION_MAX);
  const price = useSingleValueFilter('price', PRICE_MAX);
  const hotelDistance = useHotelDistanceFilter(DISTANCE_MAX);

  // Local-only search state for the city/agent typeahead
  const [locationSearch, setLocationSearch] = useState('');
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [debouncedAgentSearch, setDebouncedAgentSearch] = useState('');

  // ── Data fetching (only when the modal is open) ──────────────────────────
  const {
    data: cities,
    isLoading: citiesLoading,
    error: citiesError,
  } = useCities({ enabled: isOpen });

  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useQuery<Agent[], Error>({
    queryKey: ['agents', 'filter-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, known_as, slug')
        .not('slug', 'is', null)
        .not('known_as', 'is', null)
        .order('known_as', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ── Debounce helpers ─────────────────────────────────────────────────────
  const debouncedLocationSearchUpdater = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (val: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => setDebouncedLocationSearch(val), 300);
    };
  }, []);

  const debouncedAgentSearchUpdater = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (val: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => setDebouncedAgentSearch(val), 300);
    };
  }, []);

  // Reset typeahead inputs when the modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setLocationSearch('');
      setDebouncedLocationSearch('');
      setAgentSearch('');
      setDebouncedAgentSearch('');
    }
  }, [isOpen]);

  const filteredCities = useMemo(
    () =>
      (cities as City[] | undefined)?.filter((item) => {
        const search = debouncedLocationSearch.toLowerCase();
        return (
          item.name?.toLowerCase().includes(search) ||
          (item.state && item.state.toLowerCase().includes(search))
        );
      }) ?? [],
    [cities, debouncedLocationSearch]
  );

  const filteredAgents = useMemo(
    () =>
      agents?.filter((a) =>
        a.known_as?.toLowerCase().includes(debouncedAgentSearch.toLowerCase())
      ) ?? [],
    [agents, debouncedAgentSearch]
  );

  // ── Duration label ───────────────────────────────────────────────────────
  let durationText = `${duration.value} days`;
  if (duration.value === 30) durationText = '1 month';
  else if (duration.value > 30) durationText = `1 month ${duration.value - 30} days`;

  // ── Apply / Clear all ────────────────────────────────────────────────────
  const handleApplyAll = () => {
    location.apply();
    agent.apply();
    month.apply();
    // Single-value filters: only commit when the user has actually moved them
    // off the default (otherwise we'd add unnecessary URL noise).
    if (duration.value !== DURATION_MAX) duration.apply();
    else duration.clear();
    if (price.value !== PRICE_MAX) price.apply();
    else price.clear();
    if (hotelDistance.makkah !== DISTANCE_MAX || hotelDistance.madinah !== DISTANCE_MAX)
      hotelDistance.apply();
    else hotelDistance.clear();
    onClose();
  };

  const handleClearAll = () => {
    location.clear();
    agent.clear();
    month.clear();
    duration.clear();
    price.clear();
    hotelDistance.clear();
    setLocationSearch('');
    setDebouncedLocationSearch('');
    setAgentSearch('');
    setDebouncedAgentSearch('');
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
        <div className="relative min-h-screen text-center">
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

          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>

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
            <div className="relative z-10 inline-flex flex-col align-middle py-4 px-2 h-screen w-full max-w-4xl">
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
                    <section className="py-5 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Location"
                        active={location.isActive}
                        onClear={() => {
                          location.clear();
                          setLocationSearch('');
                          setDebouncedLocationSearch('');
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Search location..."
                        aria-label="Search location"
                        className="mb-3 px-3 py-2 border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-md w-full text-sm focus:outline-none focus:ring focus:border-primary-500"
                        value={locationSearch}
                        onChange={(e) => {
                          setLocationSearch(e.target.value);
                          debouncedLocationSearchUpdater(e.target.value);
                        }}
                      />
                      <div className="max-h-44 overflow-y-auto space-y-3 pr-1">
                        {citiesLoading && <p className="text-sm text-neutral-500">Loading…</p>}
                        {citiesError && (
                          <p className="text-sm text-red-500">Error loading locations.</p>
                        )}
                        {!citiesLoading && !citiesError && filteredCities.length === 0 && (
                          <p className="text-sm text-neutral-500">No locations found.</p>
                        )}
                        {filteredCities.map((item) => (
                          <Checkbox
                            key={item.id}
                            name={item.name}
                            label={item.name + (item.state ? ', ' + item.state : '')}
                            defaultChecked={location.selected.includes(item.name)}
                            onChange={(checked) => location.toggle(checked, item.name)}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Agent */}
                    <section className="py-5 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Agent"
                        active={agent.isActive}
                        onClear={() => {
                          agent.clear();
                          setAgentSearch('');
                          setDebouncedAgentSearch('');
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Search agent..."
                        aria-label="Search agent"
                        className="mb-3 px-3 py-2 border border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-md w-full text-sm focus:outline-none focus:ring focus:border-primary-500"
                        value={agentSearch}
                        onChange={(e) => {
                          setAgentSearch(e.target.value);
                          debouncedAgentSearchUpdater(e.target.value);
                        }}
                      />
                      <div className="max-h-44 overflow-y-auto space-y-3 pr-1">
                        {agentsLoading && <p className="text-sm text-neutral-500">Loading…</p>}
                        {agentsError && (
                          <p className="text-sm text-red-500">Error loading agents.</p>
                        )}
                        {!agentsLoading && !agentsError && filteredAgents.length === 0 && (
                          <p className="text-sm text-neutral-500">No agents found.</p>
                        )}
                        {filteredAgents.map((item) => (
                          <Checkbox
                            key={item.id}
                            name={item.known_as}
                            label={item.known_as}
                            defaultChecked={agent.selected.includes(item.slug)}
                            onChange={(checked) => agent.toggle(checked, item.slug)}
                          />
                        ))}
                      </div>
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
                        onClear={() => duration.clear()}
                      />
                      <p className="text-sm text-primary-500 mb-4">{durationText}</p>
                      <Slider
                        min={1}
                        max={DURATION_MAX}
                        value={duration.value}
                        onChange={(value) => {
                          if (typeof value === 'number') duration.setValue(value);
                        }}
                      />
                      <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>1 day</span>
                        <span>60 days</span>
                      </div>
                    </section>

                    {/* Price */}
                    <section className="py-5 sm:py-4">
                      <SectionHeader
                        title="Price per person"
                        active={price.isActive}
                        onClear={() => price.clear()}
                      />
                      <p className="text-sm text-primary-500 mb-4">
                        Up to ₹ {formatIndianPrice(price.value)}
                      </p>
                      <Slider
                        min={30000}
                        max={PRICE_MAX}
                        step={5000}
                        value={price.value}
                        onChange={(val) => price.setValue(val as number)}
                      />
                      <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>₹ 30K</span>
                        <span>₹ 3 Lakh</span>
                      </div>
                    </section>

                    {/* Hotel Distance */}
                    <section className="py-5 sm:py-4 sm:col-span-2 sm:border-t sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Hotel Distance"
                        active={hotelDistance.isActive}
                        onClear={() => hotelDistance.clear()}
                      />
                      <div className="space-y-5">
                        <div>
                          <p className="text-sm font-medium mb-1">
                            Makkah{' '}
                            <span className="text-primary-500 font-normal">
                              {formatDistance(hotelDistance.makkah)}
                            </span>
                          </p>
                          <Slider
                            min={0}
                            max={DISTANCE_MAX}
                            step={50}
                            value={hotelDistance.makkah}
                            onChange={(val) => hotelDistance.setMakkah(val as number)}
                          />
                          <div className="flex justify-between text-xs text-neutral-400 mt-1">
                            <span>0 m</span>
                            <span>5 km</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">
                            Madina{' '}
                            <span className="text-primary-500 font-normal">
                              {formatDistance(hotelDistance.madinah)}
                            </span>
                          </p>
                          <Slider
                            min={0}
                            max={DISTANCE_MAX}
                            step={50}
                            value={hotelDistance.madinah}
                            onChange={(val) => hotelDistance.setMadinah(val as number)}
                          />
                          <div className="flex justify-between text-xs text-neutral-400 mt-1">
                            <span>0 m</span>
                            <span>5 km</span>
                          </div>
                        </div>
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
