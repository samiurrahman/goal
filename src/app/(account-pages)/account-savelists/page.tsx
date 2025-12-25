'use client';

import { Tab } from '@headlessui/react';
import CarCard from '@/components/CarCard';
import ExperiencesCard from '@/components/ExperiencesCard';
import StayCard from '@/components/StayCard';
import { DEMO_CAR_LISTINGS, DEMO_EXPERIENCES_LISTINGS, DEMO_STAY_LISTINGS } from '@/data/listings';
import React, { Fragment, useState } from 'react';
import ButtonSecondary from '@/shared/ButtonSecondary';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/navigation';
import ButtonPrimary from '@/shared/ButtonPrimary';
import toast from 'react-hot-toast';

const AccountSavelists = () => {
  let [categories] = useState(['Umrah', 'Hajj']);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch all packages for this agent
  const {
    data: agentPackages,
    error: packagesError,
    isLoading: packagesLoading,
  } = useQuery<Package[]>({
    queryKey: ['agentPackages', 1],
    enabled: 1 === 1,
    queryFn: async () => {
      const { data, error } = await supabase.from('packages').select('*').eq('agent_id', 1);
      if (error) throw error;
      return data as Package[];
    },
  });

  const handleEdit = (id: number) => {
    router.push(`/listing?id=${id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete package: ' + error.message);
    } else {
      toast.success('Package deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['agentPackages', 1] });
    }
  };

  const renderSection1 = () => {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex justify-between">
          <h2 className="text-3xl font-semibold">Save lists</h2>
          <ButtonPrimary type="submit" className="ml-4" onClick={() => router.push('/listing')}>
            Add New Package
          </ButtonPrimary>
        </div>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

        <div>
          <Tab.Group>
            <Tab.List className="flex space-x-1 overflow-x-auto">
              {categories.map((item) => (
                <Tab key={item} as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={`flex-shrink-0 block !leading-none font-medium px-5 py-2.5 text-sm sm:text-base sm:px-6 sm:py-3 capitalize rounded-full focus:outline-none ${
                        selected
                          ? 'bg-secondary-900 text-secondary-50 '
                          : 'text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-100 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      } `}
                    >
                      {item}
                    </button>
                  )}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels>
              <Tab.Panel className="mt-8">
                <div className="grid grid-cols-1 gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {agentPackages &&
                    Array.isArray(agentPackages) &&
                    agentPackages.length > 0 &&
                    agentPackages.map((stay) => (
                      <div key={stay.id} className="relative">
                        <StayCard data={stay} />
                        <div className="absolute top-2 right-2 z-10 flex flex-col space-y-1">
                          <button
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            onClick={() => handleEdit(stay.id)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                            onClick={() => handleDelete(stay.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex mt-11 justify-center items-center">
                  <ButtonSecondary>Show me more</ButtonSecondary>
                </div>
              </Tab.Panel>
              <Tab.Panel className="mt-8">
                <div className="grid grid-cols-1 gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {DEMO_EXPERIENCES_LISTINGS.filter((_, i) => i < 8).map((stay) => (
                    <ExperiencesCard key={stay.id} data={stay} />
                  ))}
                </div>
                <div className="flex mt-11 justify-center items-center">
                  <ButtonSecondary>Show me more</ButtonSecondary>
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    );
  };

  return renderSection1();
};

export default AccountSavelists;
