'use client';

import React, { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { showApiError } from '@/lib/apiErrors';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonSecondary from '@/shared/ButtonSecondary';
import Input from '@/shared/Input';
import Label from '@/components/Label';
import CityAutocomplete, { SelectedCity } from '@/components/CityAutocomplete';
import { supabase } from '@/utils/supabaseClient';
import { slugify, RESERVED_AGENT_SLUGS } from '@/lib/slug';

// Mirrors the mapping in profile/page.tsx — cities.country_code is a 2-letter
// ISO code, but agents.country is a free-text display name. Falls through to
// the raw code so unmapped countries don't get silently erased.
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

export interface ProfileGateAgentSeed {
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

export interface ProfileGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Fired after a successful save with the resolved slug + city snapshot so
  // the parent can refresh local state and open the package wizard.
  onComplete: (next: {
    slug: string;
    cityId: number;
    cityLabel: string;
    knownAs: string;
    contactNumber: string;
  }) => void;
  agent: ProfileGateAgentSeed;
}

const ProfileGateModal = ({ isOpen, onClose, onComplete, agent }: ProfileGateModalProps) => {
  const [knownAs, setKnownAs] = useState('');
  const [slug, setSlug] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form to the agent's current values whenever the modal opens. Lets
  // the agent partially-complete fields, close, and come back without losing
  // what they typed last time (since we already saved it on previous attempt).
  useEffect(() => {
    if (!isOpen) return;
    setKnownAs((agent.known_as || '').trim());
    setSlug((agent.slug || '').trim());
    setContactNumber((agent.contact_number || '').trim());
    if (agent.city_id) {
      void (async () => {
        const { data } = await supabase
          .from('cities')
          .select('id, slug, name, admin1_name, country_code')
          .eq('id', agent.city_id)
          .maybeSingle();
        if (data) {
          setSelectedCity({
            id: Number(data.id),
            slug: data.slug,
            name: data.name,
            admin1_name: data.admin1_name,
            country_code: data.country_code,
          });
        }
      })();
    } else {
      setSelectedCity(null);
    }
  }, [isOpen, agent.city_id, agent.known_as, agent.slug, agent.contact_number]);

  const handleSave = async () => {
    if (isSaving) return;

    const trimmedKnownAs = knownAs.trim();
    if (trimmedKnownAs.length < 2) {
      toast.error('Business name must be at least 2 characters.');
      return;
    }

    const desiredSlug = slug.trim().toLowerCase();
    if (!desiredSlug || desiredSlug.length < 2) {
      toast.error('URL handle must be at least 2 characters.');
      return;
    }
    if (desiredSlug !== slugify(desiredSlug)) {
      toast.error('URL handle must contain only lowercase letters, numbers, and hyphens.');
      return;
    }
    if (RESERVED_AGENT_SLUGS.has(desiredSlug)) {
      toast.error('That URL handle is reserved. Please pick a different one.');
      return;
    }

    if (!selectedCity) {
      toast.error('Please pick your city from the list.');
      return;
    }

    const trimmedPhone = contactNumber.trim();
    const digitCount = (trimmedPhone.match(/\d/g) || []).length;
    if (digitCount < 7) {
      toast.error('Please enter a valid contact number.');
      return;
    }

    setIsSaving(true);

    const oldSlug = (agent.slug || '').trim().toLowerCase();
    const slugChanged = desiredSlug !== oldSlug;

    if (slugChanged) {
      const { data: existing } = await supabase
        .from('agents')
        .select('id')
        .eq('slug', desiredSlug)
        .neq('id', agent.id)
        .maybeSingle();
      if (existing) {
        setIsSaving(false);
        toast.error('That URL handle is already taken. Please pick a different one.');
        return;
      }
    }

    const { error } = await supabase
      .from('agents')
      .update({
        known_as: trimmedKnownAs,
        contact_number: trimmedPhone,
        slug: desiredSlug,
        city_id: selectedCity.id,
        // Mirror the structured city into the legacy text columns so existing
        // readers (checkout pages, packages_with_agent.package_location alias)
        // see the right values. profile/page.tsx writes both in lockstep too.
        city: selectedCity.name,
        state: selectedCity.admin1_name ?? '',
        country: countryNameFromCode(selectedCity.country_code) || '',
      })
      .eq('id', agent.id);

    if (error) {
      setIsSaving(false);
      if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) {
        toast.error('That URL handle was just taken by someone else. Please pick a different one.');
        return;
      }
      showApiError(error, { message: 'Failed to save profile. Please try again.' });
      return;
    }

    // Record old → new slug mapping for 301 redirects, matching profile/page.tsx.
    // Best-effort: the table may not exist on every install.
    if (slugChanged && oldSlug && agent.auth_user_id) {
      const { error: redirectError } = await supabase
        .from('agent_slug_redirects')
        .insert({ old_slug: oldSlug, new_slug: desiredSlug, agent_id: agent.id });
      if (redirectError && !/does not exist|relation/i.test(redirectError.message || '')) {
        console.warn('Could not record slug redirect:', redirectError.message);
      }
    }

    // Propagate slug change to the denormalized agent_name on packages /
    // bookings — same maintenance the profile page does on slug edits.
    if (slugChanged && oldSlug && agent.auth_user_id) {
      const { error: pkgError } = await supabase
        .from('packages')
        .update({ agent_name: desiredSlug })
        .eq('agent_id', agent.auth_user_id);
      if (pkgError) console.warn('Failed to sync agent_name on packages:', pkgError.message);

      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ agent_name: desiredSlug })
        .eq('agent_id', agent.auth_user_id);
      if (bookingError) console.warn('Failed to sync agent_name on bookings:', bookingError.message);
    }

    setIsSaving(false);
    toast.success('Profile saved. Opening package wizard…');
    onComplete({
      slug: desiredSlug,
      cityId: selectedCity.id,
      cityLabel: selectedCity.name,
      knownAs: trimmedKnownAs,
      contactNumber: trimmedPhone,
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={() => {
          if (!isSaving) onClose();
        }}
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
            <div className="inline-block w-full max-w-xl p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-neutral-900 shadow-xl rounded-2xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Dialog.Title className="text-lg font-semibold">
                    Complete your business profile
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    Pilgrims see this info on every package card. You can change it later from your
                    profile page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isSaving) onClose();
                  }}
                  className="inline-flex items-center justify-center rounded-xl p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Business name</Label>
                  <Input
                    className="mt-1.5"
                    value={knownAs}
                    onChange={(e) => setKnownAs(e.target.value)}
                    placeholder="e.g. Iqra Travels"
                  />
                </div>

                <div>
                  <Label>Public URL handle</Label>
                  <div className="mt-1.5 flex items-stretch overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 focus-within:border-primary-500">
                    <span className="flex items-center px-3 text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-700">
                      searchumrah.com/
                    </span>
                    <input
                      className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      placeholder="iqra-travels"
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Lowercase letters, numbers, and hyphens only.
                  </p>
                </div>

                <div>
                  <Label>City</Label>
                  <div className="mt-1.5">
                    <CityAutocomplete
                      value={selectedCity}
                      onChange={(city) => setSelectedCity(city)}
                      placeholder="Search your city…"
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Your packages will appear under this city in the location filter.
                  </p>
                </div>

                <div>
                  <Label>Contact number</Label>
                  <Input
                    type="tel"
                    className="mt-1.5"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <ButtonSecondary
                  type="button"
                  onClick={() => {
                    if (!isSaving) onClose();
                  }}
                  className="!text-sm"
                  disabled={isSaving}
                >
                  Cancel
                </ButtonSecondary>
                <ButtonPrimary
                  type="button"
                  onClick={handleSave}
                  className="!text-sm"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : 'Save & continue'}
                </ButtonPrimary>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ProfileGateModal;
