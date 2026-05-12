'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import ImageUpload from '@/components/ImageUpload';
import Label from '@/components/Label';
import CityAutocomplete, { SelectedCity } from '@/components/CityAutocomplete';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Input from '@/shared/Input';
import Select from '@/shared/Select';
import RichTextEditor from '@/shared/RichTextEditor';
import Checkbox from '@/shared/Checkbox';
import Textarea from '@/shared/Textarea';
import type { Agent, AgentInfoFeature, TwMainColor } from '@/data/types';
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
    const agentRow = agent as unknown as Record<string, unknown>;
    const cityId = agentRow.city_id;
    if (cityId == null) {
      setSelectedCity(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, slug, name, admin1_name')
        .eq('id', cityId)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setSelectedCity({
        id: Number(data.id),
        slug: data.slug,
        name: data.name,
        admin1_name: data.admin1_name,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [agent]);

  const canSave = !!agent?.id && !isLoading && !isSaving;

  const updateField = (field: keyof AgentProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // When the user picks a city from the autocomplete, mirror the structured
  // record into the legacy form.city / form.state strings so existing reads
  // (checkout pages, packages_with_agent.package_location) keep showing the
  // right text. The canonical source on save is selectedCity.id → city_id.
  const handleCityPick = (city: SelectedCity | null) => {
    setSelectedCity(city);
    if (!city) {
      setForm((prev) => ({ ...prev, city: '', state: '' }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      city: city.name,
      state: city.admin1_name ?? '',
    }));
  };

  const handleSave = async () => {
    if (!agent?.id || isSaving) return;

    setIsSaving(true);

    const experiencePayload = experienceField ? { [experienceField]: form.experience.trim() } : {};

    // Slug change handling — validate, check uniqueness, record redirect, then update
    const oldSlug = (agent.slug || '').trim().toLowerCase();
    const desiredSlug = form.slug.trim().toLowerCase();
    let slugUpdate: Record<string, string> = {};

    if (desiredSlug && desiredSlug !== oldSlug) {
      if (RESERVED_AGENT_SLUGS.has(desiredSlug)) {
        setIsSaving(false);
        toast.error('That URL is reserved by the system. Please pick a different one.');
        return;
      }
      if (desiredSlug !== slugify(desiredSlug) || desiredSlug.length < 2) {
        setIsSaving(false);
        toast.error('Invalid URL. Use lowercase letters, numbers, and hyphens only.');
        return;
      }

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
        name: form.name.trim(),
        known_as: form.known_as.trim(),
        contact_number: form.contact_number.trim(),
        alternate_number: form.alternate_number.trim(),
        whatsapp_url: form.whatsapp_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        email_id: form.email_id.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        city_id: selectedCity?.id ?? null,
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
                  className="mt-1.5"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter legal name"
                />
              </div>

              <div>
                <Label>Known As</Label>
                <Input
                  className="mt-1.5"
                  value={form.known_as}
                  onChange={(e) => updateField('known_as', e.target.value)}
                  placeholder="Public profile name"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Public URL</Label>
                <div className="mt-1.5 flex items-stretch rounded-2xl border border-neutral-300 dark:border-neutral-600 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
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
                    placeholder="your-business-name"
                    className="flex-1 px-3 py-3 bg-transparent text-sm focus:outline-none"
                  />
                </div>

                {(() => {
                  const trimmed = form.slug.trim();
                  const original = (agent?.slug || '').trim();
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
                  className="mt-1.5"
                  value={form.contact_number}
                  onChange={(e) => updateField('contact_number', e.target.value)}
                  placeholder="Primary phone number"
                />
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

              <div>
                <Label>Location</Label>
                <div className="mt-1.5">
                  <CityAutocomplete
                    value={selectedCity}
                    onChange={handleCityPick}
                    placeholder="Search city (e.g. Akola)"
                    initialQuery={form.city ? form.city : undefined}
                  />
                </div>
                {form.city && !selectedCity ? (
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
                <Select
                  className="mt-1.5"
                  value={form.country}
                  onChange={(e) => updateField('country', e.target.value)}
                >
                  {form.country ? <option value={form.country}>{form.country}</option> : null}
                  <option value="">Select country</option>
                  <option value="India">India</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Pakistan">Pakistan</option>
                  <option value="Bangladesh">Bangladesh</option>
                  <option value="Indonesia">Indonesia</option>
                </Select>
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

                {infoSection.features.map((feature, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Feature {index + 1}
                      </span>
                      {infoSection.features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Badge Name</Label>
                        <Input
                          className="mt-1"
                          value={feature.badge_name}
                          onChange={(e) =>
                            updateFeature(index, 'badge_name', e.target.value)
                          }
                          placeholder="e.g. Best Service"
                        />
                      </div>
                      <div>
                        <Label>Badge Color</Label>
                        <Select
                          className="mt-1"
                          value={feature.badge_color}
                          onChange={(e) =>
                            updateFeature(index, 'badge_color', e.target.value)
                          }
                        >
                          {(
                            [
                              'blue',
                              'green',
                              'red',
                              'yellow',
                              'pink',
                              'purple',
                              'indigo',
                              'gray',
                            ] as const
                          ).map((c) => (
                            <option key={c} value={c}>
                              {c.charAt(0).toUpperCase() + c.slice(1)}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Title</Label>
                        <Input
                          className="mt-1"
                          value={feature.title}
                          onChange={(e) =>
                            updateFeature(index, 'title', e.target.value)
                          }
                          placeholder="Feature title"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          className="mt-1"
                          value={feature.description}
                          onChange={(e) =>
                            updateFeature(index, 'description', e.target.value)
                          }
                          placeholder="Brief description"
                          rows={2}
                        />
                      </div>
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
