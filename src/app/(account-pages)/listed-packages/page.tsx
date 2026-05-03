'use client';

import { Tab } from '@headlessui/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/navigation';
import ButtonPrimary from '@/shared/ButtonPrimary';
import toast, { Toaster } from 'react-hot-toast';
import AddPackageWizardModal from './AddPackageWizardModal';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const formatPackageRef = (id: number) => `PK-${String(id).padStart(6, '0')}`;

const formatDateLabel = (value: unknown) => {
  if (!value) return 'TBD';
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-IN');
};

const makeCloneTitle = (title: string) => `${title} Copy`;

const makeCloneSlug = (slug: string | null, title: string, packageId: number) => {
  const base = slugify((slug || '').trim() || title.trim() || `package-${packageId}`);
  return `${base}-draft-${Date.now()}`;
};

const ListedPackagesPage = () => {
  const categories = ['Umrah', 'Hajj'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const [agentUUID, setAgentUUID] = useState<string | null>(null);
  const [agentSlug, setAgentSlug] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [expandedPackageIds, setExpandedPackageIds] = useState<number[]>([]);

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
        .select('id, auth_user_id, email_id, slug, known_as')
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
          .select('id, auth_user_id, email_id, slug, known_as')
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

      let resolvedSlug = (agentRow.slug || '').trim();
      if (!resolvedSlug) {
        const sourceName = (agentRow.known_as || '').trim() || user.email || user.id;
        resolvedSlug = slugify(sourceName);
        await supabase.from('agents').update({ slug: resolvedSlug }).eq('id', agentRow.id);
      }

      setAgentUUID(user.id);
      setAgentSlug(resolvedSlug);
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

  const handleClone = async (pkg: Package) => {
    if (!agentUUID) return;

    const clonedTitle = makeCloneTitle(pkg.title || `Package ${pkg.id}`);
    const clonedSlug = makeCloneSlug(pkg.slug, pkg.title || `Package ${pkg.id}`, pkg.id);

    const packagePayload = {
      ...pkg,
      id: undefined,
      title: clonedTitle,
      slug: clonedSlug,
      published: false,
      created_at: undefined,
      updated_at: undefined,
    } as Record<string, unknown>;

    delete packagePayload.id;
    delete packagePayload.created_at;
    delete packagePayload.updated_at;

    const { data: clonedPackage, error: cloneError } = await supabase
      .from('packages')
      .insert([packagePayload])
      .select('id')
      .single();

    if (cloneError || !clonedPackage?.id) {
      toast.error('Failed to clone package: ' + (cloneError?.message || 'Unknown error'));
      return;
    }

    const { data: detailsRow } = await supabase
      .from('package_details')
      .select('*')
      .eq('package_id', pkg.id)
      .maybeSingle();

    if (detailsRow) {
      const detailsPayload = {
        ...detailsRow,
        id: undefined,
        package_id: clonedPackage.id,
      } as Record<string, unknown>;
      delete detailsPayload.id;
      await supabase.from('package_details').insert(detailsPayload);
    }

    toast.success('Draft package cloned. Open edit to adjust and publish.');
    queryClient.invalidateQueries({ queryKey: ['agentPackages', agentUUID] });
  };

  const toggle = (id: number) => {
    setExpandedPackageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (isAuthLoading) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</p>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <Toaster position="top-center" />
      <div className="flex justify-end items-center">
        {agentUUID && agentSlug ? (
          <AddPackageWizardModal
            agentAuthUserId={agentUUID}
            agentSlug={agentSlug}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['agentPackages', agentUUID] });
            }}
          />
        ) : (
          <ButtonPrimary type="button" onClick={() => router.push('/listing')}>
            Add New Package
          </ButtonPrimary>
        )}
      </div>

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
                <div className="space-y-4">
                  {agentPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="listingSection__wrap rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {pkg.title || `Package ${pkg.id}`}
                          </h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Ref: {formatPackageRef(pkg.id)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            {(pkg.type || 'UMRAH').toUpperCase()}
                          </span>
                          {pkg.published === false ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              Draft
                            </span>
                          ) : null}
                          <button
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
                            onClick={() => handleClone(pkg)}
                            type="button"
                            aria-label="Clone package"
                            title="Clone"
                          >
                            <DocumentDuplicateIcon className="w-5 h-5" />
                          </button>
                          {agentUUID && agentSlug ? (
                            <AddPackageWizardModal
                              agentAuthUserId={agentUUID}
                              agentSlug={agentSlug}
                              editPackageId={pkg.id}
                              triggerClassName="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
                              triggerContent={<PencilSquareIcon className="w-5 h-5" />}
                              onCreated={() => {
                                queryClient.invalidateQueries({
                                  queryKey: ['agentPackages', agentUUID],
                                });
                              }}
                            />
                          ) : null}
                          <button
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleDelete(pkg.id)}
                            type="button"
                            aria-label="Delete package"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggle(pkg.id)}
                            className="inline-flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                            aria-label={
                              expandedPackageIds.includes(pkg.id)
                                ? 'Collapse package details'
                                : 'Expand package details'
                            }
                          >
                            {expandedPackageIds.includes(pkg.id) ? (
                              <ChevronUpIcon className="w-5 h-5" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedPackageIds.includes(pkg.id) && (
                        <div className="mt-4 space-y-4 border-t border-neutral-200 dark:border-neutral-700 pt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-neutral-500 dark:text-neutral-400">Route</p>
                              <p className="font-medium">
                                {pkg.departure_city && pkg.arrival_city
                                  ? `${pkg.departure_city} - ${pkg.arrival_city}`
                                  : 'TBD'}
                              </p>
                            </div>
                            <div>
                              <p className="text-neutral-500 dark:text-neutral-400">Duration</p>
                              <p className="font-medium">{pkg.total_duration_days || 0} days</p>
                            </div>
                            <div>
                              <p className="text-neutral-500 dark:text-neutral-400">Price</p>
                              <p className="font-medium">
                                {pkg.currency || 'INR'}{' '}
                                {Number(pkg.price_per_person || 0).toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div>
                              <p className="text-neutral-500 dark:text-neutral-400">
                                Departure date
                              </p>
                              <p className="font-medium">{formatDateLabel(pkg.departure_date)}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500 dark:text-neutral-400">Arrival date</p>
                              <p className="font-medium">{formatDateLabel(pkg.arrival_date)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
