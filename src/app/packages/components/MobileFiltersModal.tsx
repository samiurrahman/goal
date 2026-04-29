'use client';

import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import ButtonClose from '@/shared/ButtonClose';
import Checkbox from '@/shared/Checkbox';
import Slider from 'rc-slider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCities } from '@/hooks/useCities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { MONTHS_LIST, STOP_POINTS } from '@/contains/contants';

type City = { id: string; name: string; state?: string };
type Agent = { id: string; known_as: string; slug: string };

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

const MobileFiltersModal = ({ isOpen, onClose }: MobileFiltersModalProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [locationStates, setLocationStates] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState('');

  const [agentStates, setAgentStates] = useState<string[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [debouncedAgentSearch, setDebouncedAgentSearch] = useState('');

  const [monthStates, setMonthStates] = useState<string[]>([]);

  const [durationValue, setDurationValue] = useState(10);

  const [rangePrices, setRangePrices] = useState([30000, 40000]);

  const [makkahDistance, setMakkahDistance] = useState(10);
  const [madinaDistance, setMadinaDistance] = useState(10);

  const [stopPontsStates, setStopPontsStates] = useState<string[]>([]);

  // ── Sync from URL when modal opens ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const urlLocation = searchParams.get('location');
    setLocationStates(urlLocation ? urlLocation.split(',') : []);

    const urlAgent = searchParams.get('agent_name');
    setAgentStates(urlAgent ? urlAgent.split(',') : []);

    const urlMonth = searchParams.get('month');
    setMonthStates(urlMonth ? urlMonth.split(',') : []);

    const urlDuration = searchParams.get('total_duration_days');
    setDurationValue(urlDuration ? Number(urlDuration) : 10);

    const urlPrice = searchParams.get('price');
    setRangePrices([30000, urlPrice ? Number(urlPrice) : 40000]);

    const urlMakkah = searchParams.get('makkah_hotel_distance_m');
    setMakkahDistance(urlMakkah ? Number(urlMakkah) : 10);

    const urlMadina = searchParams.get('madinah_hotel_distance_m');
    setMadinaDistance(urlMadina ? Number(urlMadina) : 10);
  }, [isOpen, searchParams]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: cities, isLoading: citiesLoading, error: citiesError } = useCities();

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

  // ── Debounce helpers ──────────────────────────────────────────────────────
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

  // ── Duration label ─────────────────────────────────────────────────────────
  let durationText = `${durationValue} days`;
  if (durationValue === 30) durationText = '1 month';
  else if (durationValue > 30) durationText = `1 month ${durationValue - 30} days`;

  // ── Apply all at once ─────────────────────────────────────────────────────
  const handleApplyAll = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (locationStates.length > 0) params.set('location', locationStates.join(','));
    else params.delete('location');

    if (agentStates.length > 0) params.set('agent_name', agentStates.join(','));
    else params.delete('agent_name');

    if (monthStates.length > 0) params.set('month', monthStates.join(','));
    else params.delete('month');

    params.set('total_duration_days', durationValue.toString());
    params.set('price', rangePrices[1].toString());
    params.set('makkah_hotel_distance_m', makkahDistance.toString());
    params.set('madinah_hotel_distance_m', madinaDistance.toString());

    router.replace(window.location.pathname + '?' + params.toString());
    onClose();
  };

  // ── Clear all ─────────────────────────────────────────────────────────────
  const handleClearAll = () => {
    setLocationStates([]);
    setLocationSearch('');
    setDebouncedLocationSearch('');
    setAgentStates([]);
    setAgentSearch('');
    setDebouncedAgentSearch('');
    setMonthStates([]);
    setDurationValue(10);
    setRangePrices([30000, 40000]);
    setMakkahDistance(10);
    setMadinaDistance(10);
    setStopPontsStates([]);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('location');
    params.delete('agent_name');
    params.delete('month');
    params.delete('total_duration_days');
    params.delete('price');
    params.delete('makkah_hotel_distance_m');
    params.delete('madinah_hotel_distance_m');
    router.replace(window.location.pathname + '?' + params.toString());
    onClose();
  };

  // ── Section heading + optional clear ──────────────────────────────────────
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
                {/* ── Header ───────────────────────────────────────────────── */}
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

                {/* ── Body ─────────────────────────────────────────────────── */}
                <div className="flex-grow overflow-y-auto">
                  {/*
                    Portrait  (default)  → 1 column, sections separated by dividers
                    Landscape / sm+      → 2-column grid, dividers between columns
                  */}
                  <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-x-8 divide-y divide-neutral-200 dark:divide-neutral-800 sm:divide-y-0">
                    {/* ── Location ──────────────────────────────────────── */}
                    <section className="py-5 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Location"
                        active={locationStates.length > 0}
                        onClear={() => {
                          setLocationStates([]);
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
                            defaultChecked={locationStates.includes(item.name)}
                            onChange={(checked) =>
                              setLocationStates((prev) =>
                                checked ? [...prev, item.name] : prev.filter((i) => i !== item.name)
                              )
                            }
                          />
                        ))}
                      </div>
                    </section>

                    {/* ── Agent ─────────────────────────────────────────── */}
                    <section className="py-5 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Agent"
                        active={agentStates.length > 0}
                        onClear={() => {
                          setAgentStates([]);
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
                            defaultChecked={agentStates.includes(item.slug)}
                            onChange={(checked) =>
                              setAgentStates((prev) =>
                                checked ? [...prev, item.slug] : prev.filter((i) => i !== item.slug)
                              )
                            }
                          />
                        ))}
                      </div>
                    </section>

                    {/* ── Month ─────────────────────────────────────────── */}
                    <section className="py-5 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Month"
                        active={monthStates.length > 0}
                        onClear={() => setMonthStates([])}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {MONTHS_LIST.map((month) => (
                          <Checkbox
                            key={month}
                            name={month}
                            label={month}
                            defaultChecked={monthStates.includes(month)}
                            onChange={(checked) =>
                              setMonthStates((prev) =>
                                checked ? [...prev, month] : prev.filter((m) => m !== month)
                              )
                            }
                          />
                        ))}
                      </div>
                    </section>

                    {/* ── Package Duration ──────────────────────────────── */}
                    <section className="py-5 sm:py-4 sm:border-b sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Package Duration"
                        active={durationValue !== 10}
                        onClear={() => setDurationValue(10)}
                      />
                      <p className="text-sm text-primary-500 mb-4">{durationText}</p>
                      <Slider
                        min={1}
                        max={60}
                        value={durationValue}
                        onChange={(value) => {
                          if (typeof value === 'number') setDurationValue(value);
                        }}
                      />
                      <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>1 day</span>
                        <span>60 days</span>
                      </div>
                    </section>

                    {/* ── Price ─────────────────────────────────────────── */}
                    <section className="py-5 sm:py-4">
                      <SectionHeader
                        title="Price per person"
                        active={rangePrices[1] !== 40000}
                        onClear={() => setRangePrices([30000, 40000])}
                      />
                      <p className="text-sm text-primary-500 mb-4">
                        Up to ₹ {formatIndianPrice(rangePrices[1])}
                      </p>
                      <Slider
                        min={30000}
                        max={300000}
                        step={5000}
                        value={rangePrices[1]}
                        onChange={(val) => setRangePrices([30000, val as number])}
                      />
                      <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>₹ 30K</span>
                        <span>₹ 3 Lakh</span>
                      </div>
                    </section>

                    {/* ── Hotel Distance ────────────────────────────────── */}
                    <section className="py-5 sm:py-4">
                      <SectionHeader
                        title="Hotel Distance"
                        active={makkahDistance !== 10 || madinaDistance !== 10}
                        onClear={() => {
                          setMakkahDistance(10);
                          setMadinaDistance(10);
                        }}
                      />
                      <div className="space-y-5">
                        <div>
                          <p className="text-sm font-medium mb-1">
                            Makkah{' '}
                            <span className="text-primary-500 font-normal">
                              {formatDistance(makkahDistance)}
                            </span>
                          </p>
                          <Slider
                            min={0}
                            max={5000}
                            step={50}
                            value={makkahDistance}
                            onChange={(val) => setMakkahDistance(val as number)}
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
                              {formatDistance(madinaDistance)}
                            </span>
                          </p>
                          <Slider
                            min={0}
                            max={5000}
                            step={50}
                            value={madinaDistance}
                            onChange={(val) => setMadinaDistance(val as number)}
                          />
                          <div className="flex justify-between text-xs text-neutral-400 mt-1">
                            <span>0 m</span>
                            <span>5 km</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* ── Stop Points ── full-width on both layouts ──────── */}
                    <section className="py-5 sm:py-4 sm:col-span-2 sm:border-t sm:border-neutral-200 sm:dark:border-neutral-800">
                      <SectionHeader
                        title="Flight Stop"
                        active={stopPontsStates.length > 0}
                        onClear={() => setStopPontsStates([])}
                      />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {STOP_POINTS.map((item) => (
                          <Checkbox
                            key={item.name}
                            name={item.name}
                            label={item.name}
                            defaultChecked={stopPontsStates.includes(item.name)}
                            onChange={(checked) =>
                              setStopPontsStates((prev) =>
                                checked ? [...prev, item.name] : prev.filter((i) => i !== item.name)
                              )
                            }
                          />
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                {/* ── Footer ───────────────────────────────────────────────── */}
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
