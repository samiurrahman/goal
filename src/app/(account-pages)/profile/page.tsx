'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import ImageUpload from '@/components/ImageUpload';
import Label from '@/components/Label';
import CityAutocomplete, { SelectedCity } from '@/components/CityAutocomplete';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Input from '@/shared/Input';
import RichTextEditor from '@/shared/RichTextEditor';
import Checkbox from '@/shared/Checkbox';
import Textarea from '@/shared/Textarea';
import Badge from '@/shared/Badge';
import type { Agent, AgentInfoFeature, TwMainColor } from '@/data/types';

const FEATURE_BADGE_COLORS: { value: TwMainColor; label: string; swatch: string }[] = [
  { value: 'blue', label: 'Blue', swatch: 'bg-blue-500' },
  { value: 'green', label: 'Green', swatch: 'bg-green-500' },
  { value: 'red', label: 'Red', swatch: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', swatch: 'bg-yellow-500' },
  { value: 'pink', label: 'Pink', swatch: 'bg-pink-500' },
  { value: 'purple', label: 'Purple', swatch: 'bg-purple-500' },
  { value: 'indigo', label: 'Indigo', swatch: 'bg-indigo-500' },
  { value: 'gray', label: 'Gray', swatch: 'bg-gray-500' },
];
import { supabase } from '@/utils/supabaseClient';
import { slugify, RESERVED_AGENT_SLUGS } from '@/lib/slug';
import { revalidatePaths } from '@/utils/revalidate';

// Propagate slug changes to the denormalized `agent_name` column on packages
// (used to build URLs) and bookings. known_as / profile_image are NOT
// propagated — they're sourced from the `agents` row directly via the
// `packages_with_agent` view, so renaming or changing the avatar takes effect
// immediately without any cross-table writes.
// Best-effort: failures are logged but don't surface as errors to the user.
const syncDenormalizedAgentFields = async ({
  authUserId,
  oldSlug,
  newSlug,
}: {
  authUserId: string | null;
  oldSlug: string;
  newSlug: string;
}) => {
  if (!authUserId) return;
  if (!newSlug || newSlug === oldSlug) return;

  const { error: pkgError } = await supabase
    .from('packages')
    .update({ agent_name: newSlug })
    .eq('agent_id', authUserId);
  if (pkgError) console.warn('Failed to sync agent_name on packages:', pkgError.message);

  const { error: bookingError } = await supabase
    .from('bookings')
    .update({ agent_name: newSlug })
    .eq('agent_id', authUserId);
  if (bookingError)
    console.warn('Failed to sync agent_name on bookings:', bookingError.message);

  // package_details may carry a denormalized agent_name on some installations.
  // Look up this agent's package IDs first; if the column is missing the
  // update simply errors and we ignore it (best-effort).
  const { data: pkgRows } = await supabase
    .from('packages')
    .select('id')
    .eq('agent_id', authUserId);
  const packageIds = (pkgRows || []).map((row: { id: number | string }) => row.id);
  if (packageIds.length > 0) {
    const { error } = await supabase
      .from('package_details')
      .update({ agent_name: newSlug })
      .in('package_id', packageIds);
    if (error && !/column .* does not exist/i.test(error.message || '')) {
      console.warn('Failed to sync agent_name on package_details:', error.message);
    }
  }
};

// ISO-3166 alpha-2 → display name for the countries the form supports.
// The cities table stores country as a 2-letter code; the agents.country
// column is a free-text display name (legacy schema), so we translate on
// the way in. Unknown codes fall through to the raw code rather than
// silently erasing the country field.
const COUNTRY_NAME_BY_CODE: Record<string, string> = {
  IN: 'India',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  ID: 'Indonesia',
};

const countryNameFromCode = (code: string | null | undefined): string => {
  if (!code) return '';
  const upper = code.toUpperCase();
  return COUNTRY_NAME_BY_CODE[upper] ?? upper;
};

// Field-level validators. Pure functions returning the error string for a
// given value, or `undefined` when valid. Used by both the onBlur handlers
// (per-field feedback as the user moves between inputs) and handleSave (the
// final guard before the supabase write).
const validateAgentName = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length < 2) return 'Name is required (at least 2 characters).';
  return undefined;
};

const validateKnownAs = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (trimmed.length < 2) return 'Business name is required (at least 2 characters).';
  return undefined;
};

const validateAgentSlug = (value: string): string | undefined => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) return 'URL handle is required.';
  if (trimmed !== slugify(trimmed))
    return 'URL handle must contain only lowercase letters, numbers, and hyphens.';
  if (RESERVED_AGENT_SLUGS.has(trimmed))
    return 'That URL handle is reserved by the system. Please pick a different one.';
  return undefined;
};

const validateContactNumber = (value: string): string | undefined => {
  const digitCount = (value.match(/\d/g) || []).length;
  if (digitCount < 7) return 'A valid contact number is required.';
  return undefined;
};

interface AgentProfileFormState {
  name: string;
  known_as: string;
  slug: string;
  contact_number: string;
  alternate_number: string;
  whatsapp_url: string;
  instagram_url: string;
  facebook_url: string;
  email_id: string;
  address: string;
  city: string;
  state: string;
  country: string;
  profile_image: string;
  banner_image: string;
  experience: string;
  about_us: string;
}

const AgentProfilePage = () => {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // The structured city record (id, slug, name, admin1_name) we'll persist
  // as agents.city_id. form.city / form.state are still mirrored for legacy
  // readers (checkout pages, packages_with_agent view's package_location
  // alias) — the autocomplete writes both in lockstep.
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  // True once the async city fetch for the loaded agent has finished (or
  // confirmed there's no city_id). Before this point a fast Save click should
  // still fall back to agent.city_id so we don't spuriously null the city.
  // After this point, selectedCity is the canonical value — if it's null the
  // user actively cleared the field and must pick a new city before saving.
  const [cityHydrated, setCityHydrated] = useState(false);
  const cityFieldRef = useRef<HTMLDivElement>(null);
  const [experienceField, setExperienceField] = useState<string | undefined>();
  const [form, setForm] = useState<AgentProfileFormState>({
    name: '',
    known_as: '',
    slug: '',
    contact_number: '',
    alternate_number: '',
    whatsapp_url: '',
    instagram_url: '',
    facebook_url: '',
    email_id: '',
    address: '',
    city: '',
    state: '',
    country: '',
    profile_image: '',
    banner_image: '',
    experience: '',
    about_us: '',
  });

  const [infoSection, setInfoSection] = useState<{
    heading: string;
    features: AgentInfoFeature[];
    use_default_image: boolean;
    image_url: string | null;
  }>({
    heading: 'What We Provide',
    features: [{ badge_name: '', badge_color: 'blue', title: '', description: '' }],
    use_default_image: true,
    image_url: null,
  });
  const [isSavingInfoSection, setIsSavingInfoSection] = useState(false);
  const [pendingInfoImage, setPendingInfoImage] = useState<File | null>(null);

  // Per-field validation errors for the four identity fields. Each is set
  // on blur (and on a failed save) and cleared on the next keystroke into
  // that field. The handleSave function still re-runs the validators as a
  // final guard for fields the user never blurred.
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    known_as?: string;
    slug?: string;
    contact_number?: string;
    city?: string;
  }>({});

  useEffect(() => {
    let isMounted = true;

    const loadAgentProfile = async () => {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        toast.error(`Failed to load agent profile: ${error.message}`);
        setIsLoading(false);
        return;
      }

      const agentProfile = (data as Agent | null) ?? null;
      const agentRecord = (agentProfile || {}) as Record<string, unknown>;
      const candidates = ['experience_years', 'years_of_experience', 'experience'];
      const resolvedExperienceField = candidates.find((item) => item in agentRecord);
      const resolvedExperience = resolvedExperienceField
        ? agentRecord[resolvedExperienceField]
        : undefined;

      setAgent(agentProfile);
      setExperienceField(resolvedExperienceField);
      setForm({
        name: agentProfile?.name || '',
        known_as: agentProfile?.known_as || '',
        slug: agentProfile?.slug || '',
        contact_number: agentProfile?.contact_number || '',
        alternate_number: agentProfile?.alternate_number || '',
        whatsapp_url: agentProfile?.whatsapp_url || '',
        instagram_url: agentProfile?.instagram_url || '',
        facebook_url: agentProfile?.facebook_url || '',
        email_id: agentProfile?.email_id || '',
        address: agentProfile?.address || '',
        city: agentProfile?.city || '',
        state: agentProfile?.state || '',
        country: agentProfile?.country || '',
        profile_image: agentProfile?.profile_image || '',
        banner_image: agentProfile?.banner_image || '',
        experience: resolvedExperience == null ? '' : String(resolvedExperience),
        about_us: agentProfile?.about_us || '',
      });

      if (isMounted && agentProfile) {
        let features = agentProfile.info_features;
        if (typeof features === 'string') {
          try { features = JSON.parse(features); } catch { features = []; }
        }
        setInfoSection({
          heading: agentProfile.info_heading || 'What We Provide',
          features: Array.isArray(features) && features.length > 0
            ? features
            : [{ badge_name: '', badge_color: 'blue', title: '', description: '' }],
          use_default_image: agentProfile.info_use_default_image ?? true,
          image_url: agentProfile.info_image_url || null,
        });
      }

      setIsLoading(false);
    };

    void loadAgentProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Rehydrate selectedCity from the agent record once it's loaded. The
  // agents row has city_id when the autocomplete has been used; otherwise
  // we leave selectedCity null and the input shows form.city as a hint so
  // the agent knows they should pick a structured city.
  useEffect(() => {
    if (!agent) return;
    setCityHydrated(false);
    const agentRow = agent as unknown as Record<string, unknown>;
    const cityId = agentRow.city_id;
    if (cityId == null) {
      setSelectedCity(null);
      setCityHydrated(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, slug, name, admin1_name, country_code')
        .eq('id', cityId)
        .maybeSingle();
      if (cancelled) return;
      setCityHydrated(true);
      if (error || !data) return;
      setSelectedCity({
        id: Number(data.id),
        slug: data.slug,
        name: data.name,
        admin1_name: data.admin1_name,
        country_code: data.country_code,
      });
      // Backfill form.country for legacy rows where the agent has a city_id
      // but country was never persisted (or persisted as a different label).
      // We always prefer the cities table as the source of truth.
      const derivedCountry = countryNameFromCode(data.country_code);
      if (derivedCountry) {
        setForm((prev) => (prev.country === derivedCountry ? prev : { ...prev, country: derivedCountry }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent]);

  const canSave = !!agent?.id && !isLoading && !isSaving;

  const updateField = (field: keyof AgentProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the inline error for this field on each keystroke so a stale
    // error doesn't linger while the user is actively fixing it. onBlur
    // re-runs the validator when they leave the field.
    if (field === 'name' || field === 'known_as' || field === 'slug' || field === 'contact_number') {
      setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    }
  };

  // When the user picks a city from the autocomplete, mirror the structured
  // record into the legacy form.city / form.state strings so existing reads
  // (checkout pages, packages_with_agent.package_location) keep showing the
  // right text. The canonical source on save is selectedCity.id → city_id.
  const handleCityPick = (city: SelectedCity | null) => {
    setSelectedCity(city);
    if (!city) {
      // Clearing the city clears the derived fields too — otherwise stale
      // state/country would silently get re-saved against a different city.
      setForm((prev) => ({ ...prev, city: '', state: '', country: '' }));
      if (cityHydrated) {
        setFieldErrors((prev) => ({ ...prev, city: 'City is required. Please pick from the list.' }));
      }
      return;
    }
    setFieldErrors((prev) => (prev.city ? { ...prev, city: undefined } : prev));
    setForm((prev) => ({
      ...prev,
      city: city.name,
      state: city.admin1_name ?? '',
      country: countryNameFromCode(city.country_code) || prev.country,
    }));
  };

  const handleSave = async () => {
    if (!agent?.id || isSaving) return;

    // Required-fields gate. These define a usable agent identity; saving
    // with any of them blank breaks the agent's existing packages: name /
    // known_as empty → cards display empty business name (known_as falls
    // back to name); slug empty → /[agentName]/[slug] URLs break and the
    // denormalized agent_name on packages stops matching; city_id null →
    // ALL of the agent's packages silently disappear from the /packages
    // location filter (the view aliases agents.city as package_location);
    // contact_number empty → pilgrims have no way to actually reach the
    // agent. Run every validator (not short-circuit on the first failure)
    // so the user sees all the inline errors at once — same pattern the
    // checkout page uses for guest forms.
    const nameError = validateAgentName(form.name);
    const knownAsError = validateKnownAs(form.known_as);
    const slugError = validateAgentSlug(form.slug);
    const contactError = validateContactNumber(form.contact_number);

    // selectedCity hydrates asynchronously from agent.city_id. During the
    // brief window before hydration completes, fall back to agent.city_id so
    // a fast Save click doesn't spuriously null the city. Once hydration is
    // done, selectedCity is canonical — null means the user cleared the field
    // and must pick a new city before saving.
    const persistedCityId = cityHydrated
      ? (selectedCity?.id ?? null)
      : (selectedCity?.id ?? ((agent as unknown as { city_id?: number | null }).city_id ?? null));
    const cityError = persistedCityId ? undefined : 'City is required. Please pick from the list.';

    setFieldErrors({
      name: nameError,
      known_as: knownAsError,
      slug: slugError,
      contact_number: contactError,
      city: cityError,
    });

    const firstError = nameError || knownAsError || slugError || contactError || cityError;
    if (firstError) {
      if (cityError) {
        cityFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedKnownAs = form.known_as.trim();
    const desiredSlugRaw = form.slug.trim().toLowerCase();
    const trimmedContact = form.contact_number.trim();

    setIsSaving(true);

    const experiencePayload = experienceField ? { [experienceField]: form.experience.trim() } : {};

    // Slug change handling — uniqueness check + redirect record. Format and
    // reserved-word checks were already done above against desiredSlugRaw.
    const oldSlug = (agent.slug || '').trim().toLowerCase();
    const desiredSlug = desiredSlugRaw;
    let slugUpdate: Record<string, string> = {};

    if (desiredSlug !== oldSlug) {
      // Uniqueness check (different agent already owns it)
      const { data: existing } = await supabase
        .from('agents')
        .select('id')
        .eq('slug', desiredSlug)
        .neq('id', agent.id)
        .maybeSingle();
      if (existing) {
        setIsSaving(false);
        toast.error('That URL is already taken by another agent. Please pick a different one.');
        return;
      }

      slugUpdate = { slug: desiredSlug };

      // Record the old → new mapping so old URLs can be 301-redirected.
      // If the redirects table doesn't exist yet (SQL not applied), we
      // ignore the failure; the slug update itself still proceeds.
      if (oldSlug) {
        const { error: redirectError } = await supabase
          .from('agent_slug_redirects')
          .insert({ old_slug: oldSlug, new_slug: desiredSlug, agent_id: agent.id });
        if (redirectError && !/does not exist|relation/i.test(redirectError.message || '')) {
          console.warn('Could not record slug redirect:', redirectError.message);
        }
      }
    }

    const { data, error } = await supabase
      .from('agents')
      .update({
        name: trimmedName,
        known_as: trimmedKnownAs,
        contact_number: trimmedContact,
        alternate_number: form.alternate_number.trim(),
        whatsapp_url: form.whatsapp_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        email_id: form.email_id.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        city_id: persistedCityId,
        profile_image: form.profile_image.trim() || null,
        banner_image: form.banner_image.trim() || null,
        about_us: form.about_us,
        ...experiencePayload,
        ...slugUpdate,
      })
      .eq('id', agent.id)
      .select('*')
      .maybeSingle();

    setIsSaving(false);

    if (error) {
      // Likely a unique-violation race — the user got beaten to that slug
      if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) {
        toast.error('That URL was just taken by someone else. Please pick a different one.');
        return;
      }
      toast.error(`Failed to update profile: ${error.message}`);
      return;
    }

    setAgent((data as Agent | null) ?? agent);

    // Sync slug to denormalized agent_name on packages / package_details /
    // bookings (used for URLs and lookups). known_as and profile_image are
    // sourced live from the agents row via the packages_with_agent view, so
    // no cross-table propagation needed.
    await syncDenormalizedAgentFields({
      authUserId:
        ((data as Agent | null)?.auth_user_id ?? (agent as Agent | null)?.auth_user_id) || null,
      oldSlug,
      newSlug: slugUpdate.slug || oldSlug,
    });

    // Invalidate ISR caches so the agent's public profile, every package
    // detail page, and the packages listing reflect the new known_as / slug
    // / profile_image / about_us immediately.
    const newSlug = slugUpdate.slug || oldSlug;
    const pathsToRevalidate = ['/packages'];
    if (oldSlug && oldSlug !== newSlug) pathsToRevalidate.push(`/${oldSlug}`);
    if (newSlug) pathsToRevalidate.push(`/${newSlug}`);
    void revalidatePaths(pathsToRevalidate);

    toast.success(
      slugUpdate.slug
        ? `Profile updated. Your public URL is now searchumrah.com/${slugUpdate.slug}`
        : 'Profile updated successfully.'
    );
    router.refresh();
  };

  const addFeature = () => {
    if (infoSection.features.length >= 5) return;
    setInfoSection((prev) => ({
      ...prev,
      features: [
        ...prev.features,
        { badge_name: '', badge_color: 'blue' as TwMainColor, title: '', description: '' },
      ],
    }));
  };

  const removeFeature = (index: number) => {
    if (infoSection.features.length <= 1) return;
    setInfoSection((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const updateFeature = (index: number, field: keyof AgentInfoFeature, value: string) => {
    setInfoSection((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    }));
  };

  const moveFeature = (index: number, direction: -1 | 1) => {
    setInfoSection((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.features.length) return prev;
      const next = [...prev.features];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, features: next };
    });
  };

  const handleSaveInfoSection = async () => {
    if (!agent?.id || isSavingInfoSection) return;
    setIsSavingInfoSection(true);

    let imageUrl = infoSection.image_url;

    if (!infoSection.use_default_image && pendingInfoImage) {
      const ext = pendingInfoImage.name.split('.').pop() || 'jpg';
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('agent-images')
        .upload(`agents/${agent.id}/info_section.${ext}`, pendingInfoImage, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        toast.error(`Image upload failed: ${uploadError.message}`);
        setIsSavingInfoSection(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('agent-images')
        .getPublicUrl(uploadData.path);
      imageUrl = urlData.publicUrl;
      setPendingInfoImage(null);
    }

    if (infoSection.use_default_image) {
      imageUrl = null;
    }

    const { error } = await supabase
      .from('agents')
      .update({
        info_heading: infoSection.heading.trim() || 'What We Provide',
        info_features: infoSection.features,
        info_use_default_image: infoSection.use_default_image,
        info_image_url: imageUrl,
      })
      .eq('id', agent.id);

    setIsSavingInfoSection(false);

    if (error) {
      toast.error(`Failed to save info section: ${error.message}`);
      return;
    }

    setInfoSection((prev) => ({ ...prev, image_url: imageUrl }));
    toast.success('Info section updated successfully.');
  };

  return (
    <div className="gap-4">
      <Toaster position="top-center" />

      {isLoading ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading profile...</p>
      ) : !agent ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 md:p-6">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Agent Profile</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            No agent profile is connected to this account.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {agent.slug ? (
            <div className="flex justify-end">
              <Link
                href={`/${agent.slug}`}
                className="inline-flex w-fit items-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                View Public Page
              </Link>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 md:p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label>Legal Name</Label>
                <Input
                  className={`mt-1.5 ${
                    fieldErrors.name
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                      : ''
                  }`}
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  onBlur={(e) =>
                    setFieldErrors((prev) => ({ ...prev, name: validateAgentName(e.target.value) }))
                  }
                  placeholder="Enter legal name"
                />
                {fieldErrors.name ? (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </div>

              <div>
                <Label>Known As</Label>
                <Input
                  className={`mt-1.5 ${
                    fieldErrors.known_as
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                      : ''
                  }`}
                  value={form.known_as}
                  onChange={(e) => updateField('known_as', e.target.value)}
                  onBlur={(e) =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      known_as: validateKnownAs(e.target.value),
                    }))
                  }
                  placeholder="Public profile name"
                />
                {fieldErrors.known_as ? (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.known_as}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <Label>Public URL</Label>
                <div
                  className={`mt-1.5 flex items-stretch rounded-2xl border overflow-hidden focus-within:ring-2 ${
                    fieldErrors.slug
                      ? 'border-red-500 focus-within:ring-red-200'
                      : 'border-neutral-300 dark:border-neutral-600 focus-within:ring-primary-500'
                  }`}
                >
                  <span className="inline-flex items-center px-3 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-500 dark:text-neutral-400 border-r border-neutral-300 dark:border-neutral-600 select-none whitespace-nowrap">
                    searchumrah.com/
                  </span>
                  <input
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={form.slug}
                    onChange={(e) => updateField('slug', slugify(e.target.value))}
                    onBlur={(e) =>
                      setFieldErrors((prev) => ({ ...prev, slug: validateAgentSlug(e.target.value) }))
                    }
                    placeholder="your-business-name"
                    className="flex-1 px-3 py-3 bg-transparent text-sm focus:outline-none"
                  />
                </div>

                {(() => {
                  const trimmed = form.slug.trim();
                  const original = (agent?.slug || '').trim();
                  // fieldErrors.slug covers "empty / required" on blur; the
                  // checks below give live feedback as the user types (the
                  // onBlur error is cleared on each keystroke via updateField).
                  if (fieldErrors.slug) {
                    return (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        <i className="las la-exclamation-circle mr-1" />
                        {fieldErrors.slug}
                      </p>
                    );
                  }
                  const isReserved = trimmed.length > 0 && RESERVED_AGENT_SLUGS.has(trimmed);
                  const isInvalid = trimmed.length > 0 && trimmed !== slugify(trimmed);
                  const hasChanged = trimmed.length > 0 && trimmed !== original;

                  if (isReserved) {
                    return (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        <i className="las la-exclamation-circle mr-1" />
                        That URL is reserved by the system. Please pick a different one.
                      </p>
                    );
                  }
                  if (isInvalid) {
                    return (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        <i className="las la-exclamation-circle mr-1" />
                        Use lowercase letters, numbers, and hyphens only.
                      </p>
                    );
                  }
                  if (hasChanged) {
                    return (
                      <p className="mt-1.5 text-xs rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-amber-800 dark:text-amber-200">
                        <i className="las la-exclamation-triangle mr-1" />
                        Heads up — changing your URL means anyone who already has the old link
                        (Google, social media, WhatsApp shares) will land on a 404 unless we set up
                        a redirect. Old URL: <span className="font-mono">/{original}</span>
                      </p>
                    );
                  }
                  return (
                    <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                      Your public agent page is{' '}
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">
                        searchumrah.com/{trimmed || original}
                      </span>
                    </p>
                  );
                })()}
              </div>

              <div>
                <Label>Contact Number</Label>
                <Input
                  className={`mt-1.5 ${
                    fieldErrors.contact_number
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                      : ''
                  }`}
                  value={form.contact_number}
                  onChange={(e) => updateField('contact_number', e.target.value)}
                  onBlur={(e) =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      contact_number: validateContactNumber(e.target.value),
                    }))
                  }
                  placeholder="Primary phone number"
                />
                {fieldErrors.contact_number ? (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.contact_number}
                  </p>
                ) : null}
              </div>

              <div>
                <Label>Alternate Number</Label>
                <Input
                  className="mt-1.5"
                  value={form.alternate_number}
                  onChange={(e) => updateField('alternate_number', e.target.value)}
                  placeholder="Backup phone number"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  className="mt-1.5"
                  value={form.email_id}
                  onChange={(e) => updateField('email_id', e.target.value)}
                  placeholder="Email address"
                />
              </div>

              <div>
                <Label>WhatsApp Link</Label>
                <Input
                  className="mt-1.5"
                  value={form.whatsapp_url}
                  onChange={(e) => updateField('whatsapp_url', e.target.value)}
                  placeholder="https://wa.me/919876543210"
                />
              </div>

              <div>
                <Label>Instagram Link</Label>
                <Input
                  className="mt-1.5"
                  value={form.instagram_url}
                  onChange={(e) => updateField('instagram_url', e.target.value)}
                  placeholder="https://instagram.com/yourpage"
                />
              </div>

              <div>
                <Label>Facebook Link</Label>
                <Input
                  className="mt-1.5"
                  value={form.facebook_url}
                  onChange={(e) => updateField('facebook_url', e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              <div>
                <Label>Experience (Years)</Label>
                <Input
                  className="mt-1.5"
                  value={form.experience}
                  onChange={(e) => updateField('experience', e.target.value)}
                  placeholder="e.g. 10"
                />
                {!experienceField ? (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Experience field is not configured in backend schema yet.
                  </p>
                ) : null}
              </div>

              <div ref={cityFieldRef}>
                <Label>Location</Label>
                <div className="mt-1.5">
                  <CityAutocomplete
                    value={selectedCity}
                    onChange={handleCityPick}
                    placeholder="Search city (e.g. Akola)"
                    initialQuery={form.city ? form.city : undefined}
                    // Disable the X clear button: clearing the city nulls
                    // city_id on save, which removes ALL the agent's packages
                    // from the /packages location filter. Agents can still
                    // CHANGE their city by picking a different suggestion;
                    // they just can't blank it out.
                    clearable={false}
                    className={fieldErrors.city ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
                  />
                </div>
                {fieldErrors.city ? (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.city}
                  </p>
                ) : form.city && !selectedCity ? (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Saved city is text-only ({form.city}
                    {form.state ? `, ${form.state}` : ''}). Pick from the
                    suggestions to enable proximity search on your packages.
                  </p>
                ) : null}
              </div>

              <div>
                <Label>State</Label>
                <Input
                  className="mt-1.5"
                  value={form.state}
                  readOnly
                  placeholder="Auto from city"
                />
              </div>

              <div>
                <Label>Country</Label>
                <Input
                  className="mt-1.5"
                  value={form.country}
                  readOnly
                  placeholder="Auto from city"
                />
              </div>

              <div>
                <Label>Address</Label>
                <Input
                  className="mt-1.5"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Street and area"
                />
              </div>
            </div>

            <div className="mt-5">
              <Label>About Us</Label>
              <div className="mt-1.5">
                <RichTextEditor
                  value={form.about_us}
                  onChange={(updated) => updateField('about_us', updated)}
                  placeholder="Describe your services, process, and support."
                  minHeightClassName="min-h-[220px]"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 border-t border-neutral-200 pt-5 dark:border-neutral-700 md:grid-cols-2">
              <ImageUpload
                label="Profile Picture"
                folder={`agents/${agent.id}`}
                currentImageUrl={form.profile_image}
                fixedFileName="profile"
                onUploadSuccess={(url) => updateField('profile_image', url)}
                aspectRatio="square"
              />
              <ImageUpload
                label="Banner Image"
                folder={`agents/${agent.id}`}
                currentImageUrl={form.banner_image}
                fixedFileName="banner"
                onUploadSuccess={(url) => updateField('banner_image', url)}
                aspectRatio="wide"
              />
            </div>
          </div>

          <div className="pt-2">
            <ButtonPrimary disabled={!canSave} onClick={handleSave}>
              {isSaving ? 'Saving...' : 'Update info'}
            </ButtonPrimary>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 md:p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Info Section
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Customize the &ldquo;What We Provide&rdquo; section on your public profile page.
            </p>

            <div className="mt-4 space-y-5">
              <div>
                <Label>Section Heading</Label>
                <Input
                  className="mt-1.5"
                  value={infoSection.heading}
                  onChange={(e) =>
                    setInfoSection((prev) => ({ ...prev, heading: e.target.value }))
                  }
                  placeholder="What We Provide"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Features ({infoSection.features.length}/5)</Label>
                  {infoSection.features.length < 5 && (
                    <button
                      type="button"
                      onClick={addFeature}
                      className="text-sm text-primary-6000 hover:text-primary-700 font-medium"
                    >
                      + Add Feature
                    </button>
                  )}
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2">
                  Each card on your public &ldquo;{infoSection.heading || 'What We Provide'}&rdquo; section gets a small badge, a title, and a short description. Pick a badge label that pilgrims will instantly recognise (e.g. &ldquo;Govt approved&rdquo;, &ldquo;Visa included&rdquo;).
                </p>

                {infoSection.features.map((feature, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-[12px] font-semibold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Feature {index + 1}
                        </span>
                        {feature.badge_name ? (
                          <Badge name={feature.badge_name} color={feature.badge_color} />
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">badge preview</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          disabled={index === 0}
                          onClick={() => moveFeature(index, -1)}
                          aria-label="Move up"
                        >
                          <i className="las la-arrow-up text-base" />
                        </button>
                        <button
                          type="button"
                          className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          disabled={index === infoSection.features.length - 1}
                          onClick={() => moveFeature(index, 1)}
                          aria-label="Move down"
                        >
                          <i className="las la-arrow-down text-base" />
                        </button>
                        {infoSection.features.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-1">
                        <Label>Badge label</Label>
                        <Input
                          className="mt-1.5"
                          value={feature.badge_name}
                          onChange={(e) =>
                            updateFeature(index, 'badge_name', e.target.value)
                          }
                          placeholder="Best Service"
                          maxLength={24}
                        />
                        <p className="mt-1 text-[11px] text-neutral-400">
                          Short pill above the title (max 24 chars).
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Badge colour</Label>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {FEATURE_BADGE_COLORS.map((opt) => {
                            const active = feature.badge_color === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateFeature(index, 'badge_color', opt.value)}
                                aria-pressed={active}
                                title={opt.label}
                                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                                  active
                                    ? 'border-neutral-900 dark:border-white'
                                    : 'border-transparent hover:border-neutral-300'
                                }`}
                              >
                                <span className={`block h-5 w-5 rounded-full ${opt.swatch}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Title</Label>
                      <Input
                        className="mt-1.5"
                        value={feature.title}
                        onChange={(e) => updateFeature(index, 'title', e.target.value)}
                        placeholder="Best in class service"
                      />
                      <p className="mt-1 text-[11px] text-neutral-400">
                        The bold headline on the card.
                      </p>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        className="mt-1.5"
                        value={feature.description}
                        onChange={(e) => updateFeature(index, 'description', e.target.value)}
                        placeholder="One or two sentences explaining the commitment."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-3">
                <Checkbox
                  key={String(infoSection.use_default_image)}
                  name="use_default_image"
                  label="Use default image"
                  subLabel="Uncheck to upload a custom image for the info section"
                  defaultChecked={infoSection.use_default_image}
                  onChange={(checked) =>
                    setInfoSection((prev) => ({ ...prev, use_default_image: checked }))
                  }
                />

                {!infoSection.use_default_image && (
                  <ImageUpload
                    label="Info Section Image"
                    currentImageUrl={infoSection.image_url || undefined}
                    onFileSelected={(file) => setPendingInfoImage(file)}
                    aspectRatio="wide"
                  />
                )}
              </div>

              <ButtonPrimary
                disabled={!agent?.id || isSavingInfoSection}
                onClick={handleSaveInfoSection}
              >
                {isSavingInfoSection ? 'Saving...' : 'Save Info Section'}
              </ButtonPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentProfilePage;
