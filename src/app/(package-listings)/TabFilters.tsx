'use client';

import React, { Fragment, useState } from 'react';
import { Dialog, Popover, Tab, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import ButtonClose from '@/shared/ButtonClose';
import Checkbox from '@/shared/Checkbox';
import convertNumbThousand from '@/utils/convertNumbThousand';
import Slider from 'rc-slider';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCities } from '@/hooks/useCities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';

// DEMO DATA
const stopPoints = [
  {
    name: 'Nonstop',
  },
  {
    name: 'Up to 1 stops',
  },
  {
    name: 'Up to 2 stops',
  },
  {
    name: 'Any number of stops',
  },
];

//
const TabFilters = () => {
  const [isOpenMoreFilter, setisOpenMoreFilter] = useState(false);
  const [isOnSale, setIsOnSale] = useState(true);
  // Price slider: [min, value], min=30000, max=5000000, default=40000
  const [rangePrices, setRangePrices] = useState([30000, 40000]);
  // Hotel distance sliders (in meters)
  const [makkahDistance, setMakkahDistance] = useState(10);
  const [madinaDistance, setMadinaDistance] = useState(10);

  // Format hotel distance: show in meters, or as 'X km Y m' if > 1000m
  function formatDistance(val: number) {
    if (val < 1000) {
      return `${val} m`;
    } else {
      const km = Math.floor(val / 1000);
      const m = val % 1000;
      return `${km} km${m > 0 ? ` ${m} m` : ''}`;
    }
  }
    // Format price in Indian style (e.g., 40K, 1 Lakh 10K)
    function formatIndianPrice(val: number) {
      if (val < 100000) {
        return `${Math.round(val / 1000)}K`;
      } else {
        const lakhs = Math.floor(val / 100000);
        const thousands = Math.round((val % 100000) / 1000);
        return `${lakhs} Lakh${thousands > 0 ? ` ${thousands}K` : ''}`;
      }
    }
  const [tripTimes, setTripTimes] = useState(10);
  const [sliderValue, setSliderValue] = useState(10);
  const [stopPontsStates, setStopPontsStates] = useState<string[]>([]);
  const [locationStates, setLocationStates] = useState<string[]>([]);
  const [monthStates, setMonthStates] = useState<string[]>([]);
  // Location search state
  const [locationSearch, setLocationSearch] = useState('');
  // Agent filter state
  const [agentStates, setAgentStates] = useState<string[]>([]);
  const [agentSearch, setAgentSearch] = useState('');

  // Fetch agents from Supabase
  const { data: agents, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      let { data, error } = await supabase.from('agents').select('id, known_as, slug');
      if (error) throw error;
      return data;
    },
  });
  // Agent filter logic
  const handleChangeAgent = (checked: boolean, name: string) => {
    let newStates;
    if (checked) {
      newStates = [...agentStates, name];
    } else {
      newStates = agentStates.filter((i) => i !== name);
    }
    setAgentStates(newStates);
    // Do not update URL here; only on Apply
  };

  const handleApplyAgent = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (agentStates.length > 0) {
      params.set('agent_name', agentStates.join(','));
    } else {
      params.delete('agent_name');
    }
    const pathname = window.location.pathname;
    router.replace(pathname + '?' + params.toString());
  };

  const renderTabsAgents = () => {
    // Filter agents by search
    const filteredAgents = agents?.filter((a: any) =>
      a.known_as?.toLowerCase().includes(agentSearch.toLowerCase())
    ) || [];
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
                <span onClick={() => setAgentStates([])}>{renderXClear()}</span>
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
                      className="mb-3 px-3 py-2 border border-neutral-300 rounded-md w-full focus:outline-none focus:ring focus:border-primary-500"
                      value={agentSearch}
                      onChange={e => setAgentSearch(e.target.value)}
                    />
                  </div>
                  <div className="relative flex flex-col px-5 py-2 space-y-3 max-h-72 overflow-y-auto">
                    {agentsLoading && <div>Loading...</div>}
                    {agentsError && <div>Error loading agents</div>}
                    {filteredAgents.map((item: any) => (
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
                        close();
                        setAgentStates([]);
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

  // Fetch locations (cities)
  const { data: cities, error: citiesError, isLoading: citiesLoading } = useCities();

  //
  type CatTimeKey = 'Take Off' | 'Landing';
  type CatTimesType = {
    [K in CatTimeKey]: {
      Departure: number[];
      Arrival: number[];
    };
  };

  let [catTimes, setCatTimes] = useState<CatTimesType>({
    'Take Off': {
      Departure: [0, 24],
      Arrival: [0, 24],
    },
    Landing: {
      Departure: [0, 24],
      Arrival: [0, 24],
    },
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  // Sync locationStates and monthStates with URL
  React.useEffect(() => {
    const urlLocation = searchParams.get('location');
    if (urlLocation) {
      setLocationStates(urlLocation.split(','));
    } else {
      setLocationStates([]);
    }
    const urlMonth = searchParams.get('month');
    if (urlMonth) {
      setMonthStates(urlMonth.split(','));
    } else {
      setMonthStates([]);
    }
  }, [searchParams]);

  //
  const closeModalMoreFilter = () => setisOpenMoreFilter(false);
  const openModalMoreFilter = () => setisOpenMoreFilter(true);

  //
  const handleChangeStopPoint = (checked: boolean, name: string) => {
    checked
      ? setStopPontsStates([...stopPontsStates, name])
      : setStopPontsStates(stopPontsStates.filter((i) => i !== name));
  };

  const handleChangeLocation = (checked: boolean, name: string) => {
    let newStates;
    if (checked) {
      newStates = [...locationStates, name];
    } else {
      newStates = locationStates.filter((i) => i !== name);
    }
    setLocationStates(newStates);
    // Do not update URL here; only on Apply
  };

  const handleChangeMonth = (checked: boolean, name: string) => {
    let newStates;
    if (checked) {
      newStates = [...monthStates, name];
    } else {
      newStates = monthStates.filter((i) => i !== name);
    }
    setMonthStates(newStates);
    // Do not update URL here; only on Apply
  };

  const handleApplyLocation = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (locationStates.length > 0) {
      params.set('location', locationStates.join(','));
    } else {
      params.delete('location');
    }
    if (monthStates.length > 0) {
      params.set('month', monthStates.join(','));
    } else {
      params.delete('month');
    }
    // Preserve the current pathname (e.g., /packages) when updating the URL
    const pathname = window.location.pathname;
    router.replace(pathname + '?' + params.toString());
  };
  // Hardcoded months list
  const monthsList = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const renderTabsMonth = () => {
    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none
               ${open ? '!border-primary-500 ' : ''}
                ${!!monthStates.length ? '!border-primary-500 bg-primary-50' : ''}
                `}
            >
              <span>Month</span>
              {!monthStates.length ? (
                <i className="las la-angle-down ml-2"></i>
              ) : (
                <span onClick={() => setMonthStates([])}>{renderXClear()}</span>
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
                  <div className="relative flex flex-col px-5 py-6 space-y-5 max-h-72 overflow-y-auto">
                    {monthsList.map((month) => (
                      <Checkbox
                        key={month}
                        name={month}
                        label={month}
                        defaultChecked={monthStates.includes(month)}
                        onChange={(checked) => handleChangeMonth(checked, month)}
                      />
                    ))}
                  </div>
                  <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                    <ButtonThird
                      onClick={() => {
                        close();
                        setMonthStates([]);
                      }}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      Clear
                    </ButtonThird>
                    <ButtonPrimary
                      onClick={() => {
                        handleApplyLocation();
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

  
  const renderXClear = () => {
    return (
      <span className="w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center ml-3 cursor-pointer">
        <XMarkIcon className="h-3 w-3" />
      </span>
    );
  };

  const renderTabsLocation = () => {
    // Filter cities by search
    const filteredCities = cities?.filter((item: any) => {
      const search = locationSearch.toLowerCase();
      return (
        item.name?.toLowerCase().includes(search) ||
        (item.state && item.state.toLowerCase().includes(search))
      );
    }) || [];
    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none
               ${open ? '!border-primary-500 ' : ''}
                ${!!locationStates.length ? '!border-primary-500 bg-primary-50' : ''}
                `}
            >
              <span>Location</span>
              {!locationStates.length ? (
                <i className="las la-angle-down ml-2"></i>
              ) : (
                <span onClick={() => setLocationStates([])}>{renderXClear()}</span>
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
                      placeholder="Search location..."
                      className="mb-3 px-3 py-2 border border-neutral-300 rounded-md w-full focus:outline-none focus:ring focus:border-primary-500"
                      value={locationSearch}
                      onChange={e => setLocationSearch(e.target.value)}
                    />
                  </div>
                  <div className="relative flex flex-col px-5 py-2 space-y-5 max-h-72 overflow-y-auto">
                    {filteredCities.map((item: any) => (
                      <Checkbox
                        key={item.id}
                        name={item.name}
                        label={item.name + (item.state ? ', ' + item.state : '')}
                        defaultChecked={locationStates.includes(item.name)}
                        onChange={(checked) => handleChangeLocation(checked, item.name)}
                      />
                    ))}
                  </div>
                  <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                    <ButtonThird
                      onClick={() => {
                        close();
                        setLocationStates([]);
                      }}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      Clear
                    </ButtonThird>
                    <ButtonPrimary
                      onClick={() => {
                        handleApplyLocation();
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

  const handleApplyPackageDuration = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (sliderValue) {
      params.set('total_duration_days', sliderValue.toString());
    } else {
      params.delete('total_duration_days');
    }
    // Preserve the current pathname (e.g., /packages) when updating the URL
    const pathname = window.location.pathname;
    router.replace(pathname + '?' + params.toString());
    setTripTimes(sliderValue);
  };

  const renderTabsPackageDuration = () => {
    // Format display text for days/months
    let tripTimeText = `${sliderValue} days`;
    if (sliderValue === 30) {
      tripTimeText = '1 month';
    } else if (sliderValue > 30) {
      tripTimeText = `1 month ${sliderValue - 30} days`;
    }

    // Sync sliderValue with tripTimes when URL changes
    React.useEffect(() => {
      const urlValue = searchParams.get('total_duration_days');
      if (urlValue) {
        setSliderValue(Number(urlValue));
        setTripTimes(Number(urlValue));
      }
    }, [searchParams]);

    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 focus:outline-none `}
            >
              <span>Package Duration</span>
              {renderXClear()}
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
              <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 ">
                <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                  <div className="relative flex flex-col px-5 py-6 space-y-8">
                    <div className="space-y-5">
                      <div className="font-medium">
                        Package Duration
                        <span className="text-sm font-normal ml-1 text-primary-500">{tripTimeText}</span>
                      </div>
                      <Slider
                        min={1}
                        max={60}
                        value={sliderValue}
                        onChange={(value) => {
                          if (typeof value === 'number') {
                            setSliderValue(value);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                    <ButtonThird onClick={close} sizeClass="px-4 py-2 sm:px-5">
                      Clear
                    </ButtonThird>
                    <ButtonPrimary
                      onClick={() => {
                        handleApplyPackageDuration();
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


  // Handle Apply/Clear for hotel distance
  const handleApplyHotelDistance = (close: () => void) => {
    const params = new URLSearchParams(searchParams.toString());
    if (makkahDistance) {
      params.set('makkah_hotel_distance_m', makkahDistance.toString());
    } else {
      params.delete('makkah_hotel_distance_m');
    }
    if (madinaDistance) {
      params.set('madinah_hotel_distance_m', madinaDistance.toString());
    } else {
      params.delete('madinah_hotel_distance_m');
    }
    const pathname = window.location.pathname;
    router.replace(pathname + '?' + params.toString());
    close();
  };

  const handleClearHotelDistance = (close: () => void) => {
    setMakkahDistance(10);
    setMadinaDistance(10);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('makkah_hotel_distance_m');
    params.delete('madinah_hotel_distance_m');
    const pathname = window.location.pathname;
    router.replace(pathname + '?' + params.toString());
    close();
  };

  const renderTabsHotelDistance = () => {
    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 focus:outline-none `}
            >
              <span>Hotel Distance</span>
              {renderXClear()}
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
              <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 ">
                <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                  <div className="relative flex flex-col px-5 py-6 space-y-8">
                    <div className="space-y-5">
                      <span className="font-medium">Makkah Hotel Distance <span className="text-sm font-normal ml-1 text-primary-500">{formatDistance(makkahDistance)}</span></span>
                      <Slider
                        min={0}
                        max={5000}
                        step={50}
                        value={makkahDistance}
                        onChange={(val) => setMakkahDistance(val as number)}
                      />
                    </div>
                    <div className="space-y-5">
                      <span className="font-medium">Madina Hotel Distance <span className="text-sm font-normal ml-1 text-primary-500">{formatDistance(madinaDistance)}</span></span>
                      <Slider
                        min={0}
                        max={5000}
                        step={50}
                        value={madinaDistance}
                        onChange={(val) => setMadinaDistance(val as number)}
                      />
                    </div>
                  </div>
                  <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                    <ButtonThird onClick={() => handleClearHotelDistance(close)} sizeClass="px-4 py-2 sm:px-5">
                      Clear
                    </ButtonThird>
                    <ButtonPrimary onClick={() => handleApplyHotelDistance(close)} sizeClass="px-4 py-2 sm:px-5">
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

  const renderTabsStopPoints = () => {
    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none 
              ${open ? '!border-primary-500 ' : ''}
                ${!!stopPontsStates.length ? '!border-primary-500 bg-primary-50' : ''}
                `}
            >
              <span>Flight Stop</span>
              {!stopPontsStates.length ? (
                <i className="las la-angle-down ml-2"></i>
              ) : (
                <span onClick={() => setStopPontsStates([])}>{renderXClear()}</span>
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
                <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900   border border-neutral-200 dark:border-neutral-700">
                  <div className="relative flex flex-col px-5 py-6 space-y-5">
                    {stopPoints.map((item) => (
                      <div key={item.name} className="">
                        <Checkbox
                          name={item.name}
                          label={item.name}
                          defaultChecked={stopPontsStates.includes(item.name)}
                          onChange={(checked) => handleChangeStopPoint(checked, item.name)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                    <ButtonThird
                      onClick={() => {
                        close();
                        setStopPontsStates([]);
                      }}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      Clear
                    </ButtonThird>
                    <ButtonPrimary onClick={close} sizeClass="px-4 py-2 sm:px-5">
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

  
  const handleApplyPrice = (close: () => void) => {
    const params = new URLSearchParams(searchParams.toString());
    if (rangePrices[1]) {
      params.set('price', rangePrices[1].toString());
    } else {
      params.delete('price');
    }
    // Preserve the current pathname (e.g., /packages) when updating the URL
    const pathname = window.location.pathname;
    router.replace(pathname + '?' + params.toString());
    close();
  };

  const renderTabsPriceRage = () => {
    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 focus:outline-none `}
            >
              <span>
                Price
              </span>
              {renderXClear()}
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
              <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 ">
                <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                  <div className="relative flex flex-col px-5 py-6 space-y-8">
                    <div className="space-y-5">
                      <span className="font-medium">Price per person <span className="text-sm font-normal ml-1 text-primary-500">₹ {formatIndianPrice(rangePrices[1])}</span></span>
                      <Slider
                        min={30000}
                        max={300000}
                        step={5000}
                        value={rangePrices[1]}
                        onChange={(val) => setRangePrices([30000, val as number])}
                      />
                    </div>
                  </div>
                  <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                    <ButtonThird onClick={close} sizeClass="px-4 py-2 sm:px-5">
                      Clear
                    </ButtonThird>
                    <ButtonPrimary onClick={() => handleApplyPrice(close)} sizeClass="px-4 py-2 sm:px-5">
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

  const renderTabOnSale = () => {
    return (
      <div
        className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border focus:outline-none cursor-pointer transition-all ${
          isOnSale
            ? 'border-primary-500 bg-primary-50 text-primary-700'
            : 'border-neutral-300 dark:border-neutral-700'
        }`}
        onClick={() => setIsOnSale(!isOnSale)}
      >
        <span>On sale</span>
        {isOnSale && renderXClear()}
      </div>
    );
  };

  const renderMoreFilterItem = (
    data: {
      name: string;
      description?: string;
      defaultChecked?: boolean;
    }[]
  ) => {
    const list1 = data.filter((_, i) => i < data.length / 2);
    const list2 = data.filter((_, i) => i >= data.length / 2);
    return (
      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col space-y-5">
          {list1.map((item) => (
            <Checkbox
              key={item.name}
              name={item.name}
              subLabel={item.description}
              label={item.name}
              defaultChecked={!!item.defaultChecked}
            />
          ))}
        </div>
        <div className="flex flex-col space-y-5">
          {list2.map((item) => (
            <Checkbox
              key={item.name}
              name={item.name}
              subLabel={item.description}
              label={item.name}
              defaultChecked={!!item.defaultChecked}
            />
          ))}
        </div>
      </div>
    );
  };

  // FOR RESPONSIVE MOBILE
  const renderTabMobileFilter = () => {
    return (
      <div>
        <div
          className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 focus:outline-none cursor-pointer`}
          onClick={openModalMoreFilter}
        >
          <span>
            <span className="hidden sm:inline">Flights</span> filters (3)
          </span>
          {renderXClear()}
        </div>

        <Transition appear show={isOpenMoreFilter} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={closeModalMoreFilter}
          >
            <div className="min-h-screen text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-40 dark:bg-opacity-60" />
              </Transition.Child>

              {/* This element is to trick the browser into centering the modal contents. */}
              <span className="inline-block h-screen align-middle" aria-hidden="true">
                &#8203;
              </span>
              <Transition.Child
                className="inline-block py-8 px-2 h-screen w-full max-w-4xl"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-flex flex-col w-full max-w-4xl text-left align-middle transition-all transform overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 dark:text-neutral-100 shadow-xl h-full">
                  <div className="relative flex-shrink-0 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 text-center">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      Flight filters
                    </Dialog.Title>
                    <span className="absolute left-3 top-3">
                      <ButtonClose onClick={closeModalMoreFilter} />
                    </span>
                  </div>

                  <div className="flex-grow overflow-y-auto">
                    <div className="px-4 md:px-10 divide-y divide-neutral-200 dark:divide-neutral-800">
                      {/* --------- */}
                      {/* ---- */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">Airlines</h3>
                        {/* <div className="mt-6 relative ">{renderMoreFilterItem(locationStates)}</div> */}
                      </div>
                      {/* --------- */}
                      {/* ---- */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">Stop points</h3>
                        <div className="mt-6 relative ">{renderMoreFilterItem(stopPoints)}</div>
                      </div>

                      {/* --------- */}
                      {/* ---- */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">Range Prices</h3>
                        <div className="mt-6 relative ">
                          <div className="relative flex flex-col space-y-8">
                            <div className="space-y-5">
                              <Slider
                                range
                                className="text-red-400"
                                min={0}
                                max={2000}
                                defaultValue={[0, 1000]}
                                allowCross={false}
                                onChange={(e) => setRangePrices(e as number[])}
                              />
                            </div>

                            <div className="flex justify-between space-x-5">
                              <div>
                                <label
                                  htmlFor="minPrice"
                                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                                >
                                  Min price
                                </label>
                                <div className="mt-1 relative rounded-md">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-neutral-500 sm:text-sm">$</span>
                                  </div>
                                  <input
                                    type="text"
                                    name="minPrice"
                                    disabled
                                    id="minPrice"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-3 sm:text-sm border-neutral-200 rounded-full text-neutral-900"
                                    value={rangePrices[0]}
                                  />
                                </div>
                              </div>
                              <div>
                                <label
                                  htmlFor="maxPrice"
                                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                                >
                                  Max price
                                </label>
                                <div className="mt-1 relative rounded-md">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-neutral-500 sm:text-sm">$</span>
                                  </div>
                                  <input
                                    type="text"
                                    disabled
                                    name="maxPrice"
                                    id="maxPrice"
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-3 sm:text-sm border-neutral-200 rounded-full text-neutral-900"
                                    value={rangePrices[1]}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* --------- */}
                      {/* ---- */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">
                          Strip times
                          <span className="text-sm font-normal ml-1 text-primary-500">{` <${tripTimes} hours`}</span>
                        </h3>
                        <div className="mt-6 relative ">
                          <Slider
                            min={1}
                            max={72}
                            defaultValue={tripTimes}
                            onChange={(e) => setTripTimes(e as number)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 flex-shrink-0 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                    <ButtonThird onClick={closeModalMoreFilter} sizeClass="px-4 py-2 sm:px-5">
                      Clear
                    </ButtonThird>
                    <ButtonPrimary onClick={closeModalMoreFilter} sizeClass="px-4 py-2 sm:px-5">
                      Apply
                    </ButtonPrimary>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
    );
  };

  return (
    <div className="flex lg:space-x-4">
      {/* FOR DESKTOP */}
      <div className="hidden lg:flex space-x-4">
        {renderTabsLocation()}
        {renderTabsAgents()}
        {renderTabsMonth()}
        {renderTabsPackageDuration()}
        {renderTabsPriceRage()}
        {renderTabsHotelDistance()}
        {renderTabsStopPoints()}
        {renderTabOnSale()}
      </div>

      {/* FOR RESPONSIVE MOBILE */}
      <div className="flex lg:hidden space-x-4">
        {renderTabMobileFilter()}
        {renderTabOnSale()}
      </div>
    </div>
  );
};

export default TabFilters;
