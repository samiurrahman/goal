'use client';

import { Menu, Tab } from '@headlessui/react';
import { Dialog, Transition } from '@headlessui/react';
import {
  ArrowsUpDownIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/navigation';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonSecondary from '@/shared/ButtonSecondary';
import ShareButton from '@/shared/ShareButton';
import { revalidatePaths } from '@/utils/revalidate';
import toast, { Toaster } from 'react-hot-toast';

type SortKey = 'newest' | 'published' | 'unpublished';

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  published: 'Published first',
  unpublished: 'Unpublished first',
};

const todayDateString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const AddPackageWizardModal = dynamic(() => import('./AddPackageWizardModal'), {
  ssr: false,
  loading: () => null,
});

const ProfileGateModal = dynamic(() => import('./ProfileGateModal'), {
  ssr: false,
  loading: () => null,
});

interface AgentProfileSnapshot {
  id: string;
  auth_user_id: string | null;
  slug: string;
  known_as: string | null;
  contact_number: string | null;
  city_id: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

const isProfileComplete = (agent: AgentProfileSnapshot | null): boolean => {
  if (!agent) return false;
  return (
    Boolean((agent.known_as || '').trim()) &&
    Boolean(agent.city_id) &&
    Boolean((agent.contact_number || '').trim()) &&
    Boolean((agent.slug || '').trim())
  );
};

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
  return `${base}-${Date.now()}`;
};

const LOADER_CARD_COUNT = 6;

const ListedPackagesPage = () => {
  const categories = ['Umrah'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const [agentUUID, setAgentUUID] = useState<string | null>(null);
  const [agentSlug, setAgentSlug] = useState<string>('');
  const [agentProfile, setAgentProfile] = useState<AgentProfileSnapshot | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [expandedPackageIds, setExpandedPackageIds] = useState<number[]>([]);
  const [deletePendingPackageId, setDeletePendingPackageId] = useState<number | null>(null);
  const [unpublishPendingPackage, setUnpublishPendingPackage] = useState<Package | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [origin, setOrigin] = useState<string>('');
  const [isGateOpen, setIsGateOpen] = useState(false);
  // Monotonic counter; each increment tells AddPackageWizardModal to open.
  // Starts at 0 (does not auto-open on mount).
  const [wizardOpenSignal, setWizardOpenSignal] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

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
        .select(
          'id, auth_user_id, email_id, slug, known_as, contact_number, city_id, city, state, country'
        )
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
          .select(
            'id, auth_user_id, email_id, slug, known_as, contact_number, city_id, city, state, country'
          )
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
        try {
          const { allocateAgentSlug } = await import('@/lib/slug');
          resolvedSlug = await allocateAgentSlug(sourceName);
          await supabase.from('agents').update({ slug: resolvedSlug }).eq('id', agentRow.id);
        } catch (err) {
          toast.error('Failed to set up your agent URL. Please try again.');
          console.error('agent slug allocation failed:', err);
          return;
        }
      }

      // Auto-unpublish any of this agent's packages whose departure_date is past.
      // Fire-and-forget; the packages query below picks up the new state.
      void supabase
        .from('packages')
        .update({ published: false })
        .eq('agent_id', user.id)
        .eq('published', true)
        .lt('departure_date', todayDateString());

      setAgentUUID(user.id);
      setAgentSlug(resolvedSlug);
      setAgentProfile({
        id: agentRow.id,
        auth_user_id: agentRow.auth_user_id ?? user.id,
        slug: resolvedSlug,
        known_as: agentRow.known_as ?? null,
        contact_number: agentRow.contact_number ?? null,
        city_id: agentRow.city_id ?? null,
        city: agentRow.city ?? null,
        state: agentRow.state ?? null,
        country: agentRow.country ?? null,
      });
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

  const { data: bookingCountsByPackage } = useQuery<Record<number, number>>({
    queryKey: ['agentPackageBookingCounts', agentUUID],
    enabled: !!agentUUID,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('package_id')
        .eq('agent_id', agentUUID);
      if (error) throw error;
      const counts: Record<number, number> = {};
      (data || []).forEach((row: { package_id: number | null }) => {
        if (row.package_id == null) return;
        counts[row.package_id] = (counts[row.package_id] || 0) + 1;
      });
      return counts;
    },
  });

  const sortedPackages = useMemo(() => {
    const list = [...(agentPackages || [])];
    if (sortKey === 'newest') {
      list.sort((a, b) => Number(b.id) - Number(a.id));
    } else if (sortKey === 'published') {
      list.sort((a, b) => {
        const ap = a.published === false ? 1 : 0;
        const bp = b.published === false ? 1 : 0;
        if (ap !== bp) return ap - bp;
        return Number(b.id) - Number(a.id);
      });
    } else {
      list.sort((a, b) => {
        const ap = a.published === false ? 0 : 1;
        const bp = b.published === false ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return Number(b.id) - Number(a.id);
      });
    }
    return list;
  }, [agentPackages, sortKey]);

  const setPackagePublished = async (pkg: Package, nextPublished: boolean) => {
    const { error } = await supabase
      .from('packages')
      .update({ published: nextPublished })
      .eq('id', pkg.id);

    if (error) {
      toast.error('Failed to update visibility: ' + error.message);
      return;
    }

    toast.success(nextPublished ? 'Package published.' : 'Package unpublished.');
    queryClient.invalidateQueries({ queryKey: ['agentPackages', agentUUID] });

    const pkgSlug = (pkg.slug || '').trim();
    const paths = ['/packages'];
    if (agentSlug) paths.push(`/${agentSlug}`);
    if (agentSlug && pkgSlug) paths.push(`/${agentSlug}/${pkgSlug}`);
    void revalidatePaths(paths);
  };

  const handleTogglePublished = async (pkg: Package) => {
    if (pkg.published === false) {
      // Publishing is low-risk — apply directly.
      await setPackagePublished(pkg, true);
      return;
    }
    // Unpublishing hides the package from users — confirm first.
    setUnpublishPendingPackage(pkg);
  };

  const confirmUnpublish = async () => {
    if (!unpublishPendingPackage) return;
    const target = unpublishPendingPackage;
    setUnpublishPendingPackage(null);
    await setPackagePublished(target, false);
  };

  const handleDelete = async (id: number) => {
    // Capture the slug before we drop the row, so we can revalidate the
    // package's detail page too.
    const deletedPkg = (agentPackages || []).find((p) => p.id === id);
    const deletedSlug = (deletedPkg?.slug || '').trim();

    const { error: packageError } = await supabase.from('packages').delete().eq('id', id);
    if (packageError) {
      toast.error('Failed to delete package: ' + packageError.message);
      return;
    }

    const { error: detailsError } = await supabase
      .from('package_details')
      .delete()
      .eq('package_id', id);

    if (detailsError) {
      toast.error('Package deleted, but package details cleanup failed: ' + detailsError.message);
    } else {
      toast.success('Package deleted successfully!');
    }

    queryClient.invalidateQueries({ queryKey: ['agentPackages', agentUUID] });

    const paths = ['/packages'];
    if (agentSlug) paths.push(`/${agentSlug}`);
    if (agentSlug && deletedSlug) paths.push(`/${agentSlug}/${deletedSlug}`);
    void revalidatePaths(paths);
  };

  const requestDeletePackage = (id: number) => {
    setDeletePendingPackageId(id);
  };

  const confirmDeletePackage = async () => {
    if (!deletePendingPackageId) return;
    const packageId = deletePendingPackageId;
    setDeletePendingPackageId(null);
    await handleDelete(packageId);
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
    return null;
  }

  const profileComplete = isProfileComplete(agentProfile);
  const agentCityLabel = (agentProfile?.city || '').trim();

  const handleAddNewPackageClick = () => {
    if (!agentUUID || !agentSlug) return;
    if (!profileComplete) {
      setIsGateOpen(true);
      return;
    }
    setWizardOpenSignal((n) => n + 1);
  };

  const handleGateComplete = ({
    slug,
    cityId,
    cityLabel,
    knownAs,
    contactNumber,
  }: {
    slug: string;
    cityId: number;
    cityLabel: string;
    knownAs: string;
    contactNumber: string;
  }) => {
    // Optimistically reflect the gate's writes in local state so the wizard
    // sees the completed profile on its very next open — no refetch round
    // trip needed. The DB write already succeeded inside the gate modal.
    setAgentProfile((prev) =>
      prev
        ? {
            ...prev,
            slug,
            known_as: knownAs,
            contact_number: contactNumber,
            city_id: cityId,
            city: cityLabel,
          }
        : prev
    );
    setAgentSlug(slug);
    setIsGateOpen(false);
    setWizardOpenSignal((n) => n + 1);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <Toaster position="top-center" />

      {!profileComplete && agentProfile ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong className="font-semibold">Complete your business profile</strong> to start
            listing packages. Pilgrims use your business name, city, and contact info to find and
            trust you.
          </p>
          <ButtonPrimary
            type="button"
            onClick={() => setIsGateOpen(true)}
            className="!text-sm !px-4 !py-2"
          >
            Complete profile
          </ButtonPrimary>
        </div>
      ) : null}

      {agentUUID && agentSlug ? (
        <AddPackageWizardModal
          agentAuthUserId={agentUUID}
          agentSlug={agentSlug}
          agentCity={agentCityLabel}
          triggerless
          openSignal={wizardOpenSignal}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['agentPackages', agentUUID] });
            void revalidatePaths(['/packages', `/${agentSlug}`]);
          }}
        />
      ) : null}

      {agentProfile ? (
        <ProfileGateModal
          isOpen={isGateOpen}
          onClose={() => setIsGateOpen(false)}
          onComplete={handleGateComplete}
          agent={agentProfile}
        />
      ) : null}

      <div className="flex justify-between items-center gap-3 flex-wrap">
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:border-primary-500 hover:text-primary-700 dark:hover:text-primary-300 focus:outline-none transition-colors">
            <ArrowsUpDownIcon className="w-4 h-4" />
            <span className="hidden sm:inline text-neutral-500 dark:text-neutral-400">Sort:</span>
            <span className="font-medium">{SORT_LABELS[sortKey]}</span>
            <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Menu.Items className="absolute left-0 z-20 mt-2 w-56 origin-top-left rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none overflow-hidden">
              <div className="py-2">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <Menu.Item key={key}>
                    {({ active }) => (
                      <button
                        type="button"
                        onClick={() => setSortKey(key)}
                        className={`w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition ${
                          active ? 'bg-neutral-100 dark:bg-neutral-800' : ''
                        } ${
                          sortKey === key
                            ? 'text-primary-700 dark:text-primary-300 font-medium'
                            : 'text-neutral-700 dark:text-neutral-200'
                        }`}
                      >
                        <span>{SORT_LABELS[key]}</span>
                        {sortKey === key ? <CheckIcon className="w-4 h-4" /> : null}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        {agentUUID && agentSlug ? (
          <ButtonPrimary type="button" onClick={handleAddNewPackageClick}>
            Add New Package
          </ButtonPrimary>
        ) : (
          <ButtonPrimary type="button" onClick={() => router.push('/listing')}>
            Add New Package
          </ButtonPrimary>
        )}
      </div>

      <Tab.Group>
        <Tab.List className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 p-1">
          {categories.map((item) => (
            <Tab key={item} as={Fragment}>
              {({ selected }) => (
                <button
                  className={`flex-shrink-0 block !leading-none font-medium px-5 py-2.5 text-sm sm:text-base sm:px-6 sm:py-3 capitalize rounded-full focus:outline-none transition ${
                    selected
                      ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-50'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
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
              <div className="space-y-4">
                {Array.from({ length: LOADER_CARD_COUNT }).map((_, index) => (
                  <div
                    key={`listed-package-skeleton-${index}`}
                    className="rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 animate-pulse"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-2">
                        <div className="h-6 w-56 rounded bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-700" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-7 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-7 w-7 rounded bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-7 w-7 rounded bg-neutral-200 dark:bg-neutral-700" />
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedPackages.length > 0 ? (
              <>
                <div className="space-y-4">
                  {sortedPackages.map((pkg) => {
                    const isUnpublished = pkg.published === false;
                    const bookingCount = bookingCountsByPackage?.[pkg.id] ?? 0;
                    const pkgSlug = (pkg.slug || '').trim();
                    const detailUrl =
                      agentSlug && pkgSlug ? `/${agentSlug}/${pkgSlug}` : '';
                    const shareUrl =
                      origin && pkgSlug ? `${origin}/${agentSlug}/${pkgSlug}` : '';
                    return (
                    <div
                      key={pkg.id}
                      className={`rounded-2xl shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 ${isUnpublished ? 'opacity-60 grayscale' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {detailUrl ? (
                              <Link
                                href={detailUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-colors"
                              >
                                {pkg.title || `Package ${pkg.id}`}
                              </Link>
                            ) : (
                              pkg.title || `Package ${pkg.id}`
                            )}
                          </h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Ref: {formatPackageRef(pkg.id)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            {(pkg.type || 'UMRAH').toUpperCase()}
                          </span>
                          <span
                            className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            title={`${bookingCount} booking${bookingCount === 1 ? '' : 's'} for this package`}
                          >
                            {bookingCount} booking{bookingCount === 1 ? '' : 's'}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isUnpublished
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            }`}
                          >
                            {isUnpublished ? 'Unpublished' : 'Published'}
                          </span>
                          <button
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
                            onClick={() => handleTogglePublished(pkg)}
                            type="button"
                            aria-label={isUnpublished ? 'Publish package' : 'Unpublish package'}
                            title={isUnpublished ? 'Publish' : 'Unpublish'}
                          >
                            {isUnpublished ? (
                              <EyeIcon className="w-5 h-5" />
                            ) : (
                              <EyeSlashIcon className="w-5 h-5" />
                            )}
                          </button>
                          {shareUrl ? (
                            <ShareButton
                              url={shareUrl}
                              title={pkg.title || `Package ${pkg.id}`}
                              iconOnly
                              ariaLabel="Share package link"
                            />
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
                              agentCity={agentCityLabel}
                              editPackageId={pkg.id}
                              triggerClassName="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
                              triggerContent={<PencilSquareIcon className="w-5 h-5" />}
                              onCreated={() => {
                                queryClient.invalidateQueries({
                                  queryKey: ['agentPackages', agentUUID],
                                });
                                const paths = ['/packages', `/${agentSlug}`];
                                if (pkgSlug) paths.push(`/${agentSlug}/${pkgSlug}`);
                                void revalidatePaths(paths);
                              }}
                            />
                          ) : null}
                          <button
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => requestDeletePackage(pkg.id)}
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
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No packages listed yet.
              </p>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      <Transition appear show={unpublishPendingPackage !== null} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setUnpublishPendingPackage(null)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-75"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-75"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-neutral-900 bg-opacity-50 dark:bg-opacity-80" />
            </Transition.Child>
            <span className="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-75"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-75"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-neutral-900 shadow-xl rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold">Unpublish Package</Dialog.Title>
                  <button
                    type="button"
                    onClick={() => setUnpublishPendingPackage(null)}
                    className="inline-flex items-center justify-center rounded-xl p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Unpublish <span className="font-medium">{unpublishPendingPackage?.title || `Package ${unpublishPendingPackage?.id}`}</span>?
                  Users will no longer see it in search results until you publish it again.
                </p>
                <div className="mt-6 flex gap-3 justify-end">
                  <ButtonSecondary
                    type="button"
                    onClick={() => setUnpublishPendingPackage(null)}
                    className="!text-sm"
                  >
                    Keep Published
                  </ButtonSecondary>
                  <ButtonPrimary
                    type="button"
                    onClick={confirmUnpublish}
                    className="!bg-amber-600 hover:!bg-amber-700 !text-sm"
                  >
                    Unpublish
                  </ButtonPrimary>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={deletePendingPackageId !== null} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setDeletePendingPackageId(null)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-75"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-75"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-neutral-900 bg-opacity-50 dark:bg-opacity-80" />
            </Transition.Child>
            <span className="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-75"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-75"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-neutral-900 shadow-xl rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold">Delete Package</Dialog.Title>
                  <button
                    type="button"
                    onClick={() => setDeletePendingPackageId(null)}
                    className="inline-flex items-center justify-center rounded-xl p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Are you sure you want to delete this package? This action cannot be undone.
                </p>
                <div className="mt-6 flex gap-3 justify-end">
                  <ButtonSecondary
                    type="button"
                    onClick={() => setDeletePendingPackageId(null)}
                    className="!text-sm"
                  >
                    Cancel
                  </ButtonSecondary>
                  <ButtonPrimary
                    type="button"
                    onClick={confirmDeletePackage}
                    className="!bg-red-600 hover:!bg-red-700 !text-sm"
                  >
                    Delete
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

export default ListedPackagesPage;
