'use client';

import { Tab } from '@headlessui/react';
import StayCard from '@/components/StayCard';
import React, { Fragment, useEffect, useState } from 'react';
import ButtonSecondary from '@/shared/ButtonSecondary';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/navigation';
import ButtonPrimary from '@/shared/ButtonPrimary';
import toast, { Toaster } from 'react-hot-toast';

const ListedPackagesPage = () => {
  const categories = ['Umrah', 'Hajj'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const [agentUUID, setAgentUUID] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadAgent = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (!user) {
        toast.error('Please login as an agent to view listed packages.');
        router.push('/login');
        return;
      }

      const { data: agentRowByAuth, error: agentAuthError } = await supabase
        .from('agents')
        .select('id, auth_user_id, email_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (agentAuthError) {
        toast.error('Failed to verify agent access: ' + agentAuthError.message);
        router.push('/account');
        return;
      }

      let agentRow = agentRowByAuth;

      if (!agentRow && user.email) {
        const { data: agentRowByEmail, error: agentEmailError } = await supabase
          .from('agents')
          .select('id, auth_user_id, email_id')
          .eq('email_id', user.email)
          .maybeSingle();

        if (agentEmailError) {
          toast.error('Failed to verify agent by email: ' + agentEmailError.message);
          router.push('/account');
          return;
        }

        if (agentRowByEmail) {
          agentRow = agentRowByEmail;
          if (!agentRowByEmail.auth_user_id) {
            await supabase
              .from('agents')
              .update({ auth_user_id: user.id })
              .eq('id', agentRowByEmail.id);
          }
        }
      }

      if (!agentRow) {
        toast.error('Only agents can access Listed Packages.');
        router.push('/account');
        return;
      }

      setAgentUUID(user.id);
      setIsAuthLoading(false);
    };
    void loadAgent();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const { data: agentPackages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ['agentPackages', agentUUID],
    enabled: !!agentUUID,
    queryFn: async () => {
      const { data, error } = await supabase.from('packages').select('*').eq('agent_id', agentUUID);
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
      queryClient.invalidateQueries({ queryKey: ['agentPackages', agentUUID] });
    }
  };

  if (isAuthLoading) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</p>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <Toaster position="top-center" />
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold">Listed Packages</h2>
        <ButtonPrimary type="button" onClick={() => router.push('/listing')}>
          Add New Package
        </ButtonPrimary>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      <Tab.Group>
        <Tab.List className="flex space-x-1 overflow-x-auto">
          {categories.map((item) => (
            <Tab key={item} as={Fragment}>
              {({ selected }) => (
                <button
                  className={`flex-shrink-0 block !leading-none font-medium px-5 py-2.5 text-sm sm:text-base sm:px-6 sm:py-3 capitalize rounded-full focus:outline-none ${
                    selected
                      ? 'bg-secondary-900 text-secondary-50'
                      : 'text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-100 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {item}
                </button>
              )}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel className="mt-8">
            {packagesLoading ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading packages...</p>
            ) : agentPackages && agentPackages.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {agentPackages.map((pkg) => (
                    <div key={pkg.id} className="relative">
                      <StayCard data={pkg} />
                      <div className="absolute top-2 right-2 z-10 flex flex-col space-y-1">
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                          onClick={() => handleEdit(pkg.id)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                          onClick={() => handleDelete(pkg.id)}
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
              </>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No packages listed yet.
              </p>
            )}
          </Tab.Panel>

          <Tab.Panel className="mt-8">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No Hajj packages listed yet.
            </p>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default ListedPackagesPage;
