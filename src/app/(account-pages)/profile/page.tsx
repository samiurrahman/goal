'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import ImageUpload from '@/components/ImageUpload';
import Label from '@/components/Label';
import { useCities } from '@/hooks/useCities';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Input from '@/shared/Input';
import Select from '@/shared/Select';
import RichTextEditor from '@/shared/RichTextEditor';
import type { Agent } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';

interface CityRecord {
  id: string | number;
  name: string;
  state?: string | null;
}

interface AgentProfileFormState {
  name: string;
  known_as: string;
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
  const [selectedCityId, setSelectedCityId] = useState('');
  const [experienceField, setExperienceField] = useState<string | undefined>();
  const [form, setForm] = useState<AgentProfileFormState>({
    name: '',
    known_as: '',
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

  const { data: citiesData, isLoading: citiesLoading } = useCities();
  const cities = useMemo<CityRecord[]>(() => {
    if (!Array.isArray(citiesData)) return [];
    return citiesData as CityRecord[];
  }, [citiesData]);

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
      setIsLoading(false);
    };

    void loadAgentProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!cities.length) return;
    if (!form.city) {
      setSelectedCityId('');
      return;
    }

    const matched = cities.find((city) => {
      const sameCity = (city.name || '').toLowerCase() === form.city.toLowerCase();
      if (!sameCity) return false;
      if (!form.state) return true;
      return ((city.state || '').toLowerCase() || '') === form.state.toLowerCase();
    });

    setSelectedCityId(matched ? String(matched.id) : '');
  }, [cities, form.city, form.state]);

  const canSave = !!agent?.id && !isLoading && !isSaving;

  const updateField = (field: keyof AgentProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCitySelect = (cityId: string) => {
    setSelectedCityId(cityId);

    if (!cityId) {
      setForm((prev) => ({ ...prev, city: '', state: '' }));
      return;
    }

    const selectedCity = cities.find((city) => String(city.id) === cityId);
    if (!selectedCity) return;

    setForm((prev) => ({
      ...prev,
      city: selectedCity.name || '',
      state: selectedCity.state || '',
    }));
  };

  const handleSave = async () => {
    if (!agent?.id || isSaving) return;

    setIsSaving(true);

    const experiencePayload = experienceField ? { [experienceField]: form.experience.trim() } : {};

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
        profile_image: form.profile_image.trim() || null,
        banner_image: form.banner_image.trim() || null,
        about_us: form.about_us,
        ...experiencePayload,
      })
      .eq('id', agent.id)
      .select('*')
      .maybeSingle();

    setIsSaving(false);

    if (error) {
      toast.error(`Failed to update profile: ${error.message}`);
      return;
    }

    setAgent((data as Agent | null) ?? agent);
    toast.success('Profile updated successfully.');
    router.refresh();
  };

  return (
    <div className="gap-4">
      <Toaster position="top-center" />

      {isLoading ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading profile...</p>
      ) : !agent ? (
        <div className="listingSection__wrap overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 md:p-6">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Agent Profile</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            No agent profile is connected to this account.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
                Agent Profile
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Update the details shown on your public agent page.
              </p>
            </div>
            {agent.slug ? (
              <Link
                href={`/${agent.slug}`}
                className="inline-flex w-fit items-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                View Public Page
              </Link>
            ) : null}
          </div>

          <div className="listingSection__wrap overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 md:p-6">
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
                <Select
                  className="mt-1.5"
                  value={selectedCityId}
                  onChange={(e) => handleCitySelect(e.target.value)}
                  disabled={citiesLoading}
                >
                  <option value="">{citiesLoading ? 'Loading cities...' : 'Select city'}</option>
                  {cities.map((city) => (
                    <option key={city.id} value={String(city.id)}>
                      {city.name}
                      {city.state ? `, ${city.state}` : ''}
                    </option>
                  ))}
                </Select>
                {form.city && !selectedCityId ? (
                  <p className="mt-2 text-xs text-neutral-500">
                    Saved city: {form.city}
                    {form.state ? `, ${form.state}` : ''}
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
        </div>
      )}
    </div>
  );
};

export default AgentProfilePage;
