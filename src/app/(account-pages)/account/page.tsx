'use client';

import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import Label from '@/components/Label';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonSecondary from '@/shared/ButtonSecondary';
import Input from '@/shared/Input';
import Select from '@/shared/Select';
import Textarea from '@/shared/Textarea';
import { supabase } from '@/utils/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { useCities } from '@/hooks/useCities';
import ImageUpload from '@/components/ImageUpload';

export interface AccountPageProps {}

type TravelerRelationship = 'self' | 'spouse' | 'child' | 'parent' | 'other';
type TravelerGender = 'male' | 'female' | 'other' | 'unspecified';

interface AccountFormState {
  first_name: string;
  last_name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  date_of_birth: string;
  gender: TravelerGender;
}

interface TravelerFormState {
  id: string | null;
  tempKey: string;
  label: string;
  relationship: TravelerRelationship;
  is_default: boolean;
  traveler_city: string;
  traveler_state: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: TravelerGender;
  nationality: string;
  passport_number: string;
  passport_expiry: string;
  issuing_country: string;
  phone: string;
  email: string;
  known_traveler_number: string;
  meal_preference: string;
  special_assistance: string;
}

interface CityRecord {
  id: string | number;
  name: string;
  state?: string | null;
}

const normalizeDateForInput = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') {
    // Handles both "YYYY-MM-DD" and timestamp-like strings.
    return value.includes('T') ? value.split('T')[0] : value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return '';
};

const createEmptyTraveler = (): TravelerFormState => ({
  id: null,
  tempKey: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  relationship: 'other',
  is_default: false,
  traveler_city: '',
  traveler_state: '',
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'unspecified',
  nationality: '',
  passport_number: '',
  passport_expiry: '',
  issuing_country: '',
  phone: '',
  email: '',
  known_traveler_number: '',
  meal_preference: '',
  special_assistance: '',
});

type TravelerEmptyCheckInput = {
  label?: string | null;
  traveler_city?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  passport_number?: string | null;
  phone?: string | null;
  email?: string | null;
  known_traveler_number?: string | null;
  meal_preference?: string | null;
  special_assistance?: string | null;
};

const isTravelerEmpty = (traveler: TravelerEmptyCheckInput): boolean => {
  return [
    traveler.label,
    traveler.traveler_city,
    traveler.first_name,
    traveler.last_name,
    traveler.date_of_birth,
    traveler.nationality,
    traveler.passport_number,
    traveler.phone,
    traveler.email,
    traveler.known_traveler_number,
    traveler.meal_preference,
    traveler.special_assistance,
  ].every((value) => (value || '').trim() === '');
};

const AccountPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [initialTravelerIds, setInitialTravelerIds] = useState<string[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [collapsedTravelerKeys, setCollapsedTravelerKeys] = useState<string[]>([]);
  const [deletePendingKey, setDeletePendingKey] = useState<string | null>(null);
  const [userProfileUrl, setUserProfileUrl] = useState<string>('');

  const [accountForm, setAccountForm] = useState<AccountFormState>({
    first_name: '',
    last_name: '',
    city: '',
    state: '',
    address: '',
    phone: '',
    date_of_birth: '',
    gender: 'unspecified',
  });

  const { data: citiesData, isLoading: citiesLoading } = useCities();
  const cities = useMemo<CityRecord[]>(() => {
    if (!Array.isArray(citiesData)) return [];
    return citiesData as CityRecord[];
  }, [citiesData]);

  const [travelers, setTravelers] = useState<TravelerFormState[]>([createEmptyTraveler()]);

  const canSave = useMemo(() => {
    return !!authUserId && !isLoading && !isSaving;
  }, [authUserId, isLoading, isSaving]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setAuthUserId(null);
        setIsLoading(false);
        toast.error('Please login to manage account details.');
        return;
      }

      setAuthUserId(user.id);

      const [detailsResult, travelersResult] = await Promise.all([
        supabase
          .from('user_details')
          .select(
            'first_name, last_name, city, state, address, phone, date_of_birth, gender, user_type, profile_image'
          )
          .eq('auth_user_id', user.id)
          .maybeSingle(),
        supabase
          .from('traveler_profiles')
          .select(
            'id, label, relationship, is_default, traveler_city, traveler_state, first_name, last_name, date_of_birth, gender, nationality, passport_number, passport_expiry, issuing_country, phone, email, known_traveler_number, meal_preference, special_assistance'
          )
          .eq('auth_user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true }),
      ]);

      if (!isMounted) return;

      if (detailsResult.error) {
        toast.error(`Failed to load account details: ${detailsResult.error.message}`);
      }

      const fullNameFromMetadata =
        (user.user_metadata?.full_name as string | undefined)?.trim() || '';
      const splitMetadataName = fullNameFromMetadata.split(/\s+/).filter(Boolean);
      const metadataFirstName = splitMetadataName[0] || '';
      const metadataLastName = splitMetadataName.slice(1).join(' ');

      const detailsFirstName = detailsResult.data?.first_name?.trim() || '';
      const detailsLastName = detailsResult.data?.last_name?.trim() || '';
      const detailsCity = detailsResult.data?.city?.trim() || '';
      const detailsState = detailsResult.data?.state?.trim() || '';
      const detailsAddress = detailsResult.data?.address?.trim() || '';
      const detailsPhone = detailsResult.data?.phone?.trim() || '';
      const detailsDateOfBirth = normalizeDateForInput(detailsResult.data?.date_of_birth);
      const detailsGender = (detailsResult.data?.gender as TravelerGender) || 'unspecified';

      setAccountForm({
        first_name: detailsFirstName || metadataFirstName,
        last_name: detailsLastName || metadataLastName,
        city: detailsCity,
        state: detailsState,
        address: detailsAddress,
        phone: detailsPhone,
        date_of_birth: detailsDateOfBirth,
        gender: detailsGender,
      });

      setUserProfileUrl(detailsResult.data?.profile_image?.trim() || '');

      if (travelersResult.error) {
        const isMissingTable =
          travelersResult.error.message?.toLowerCase().includes('relation') &&
          travelersResult.error.message?.toLowerCase().includes('traveler_profiles');

        if (isMissingTable) {
          toast.error('Traveler table is not created yet. Please run the migration SQL once.');
        } else {
          toast.error(`Failed to load travelers: ${travelersResult.error.message}`);
        }
      } else {
        const mappedTravelers: TravelerFormState[] = (travelersResult.data || []).map((row) => ({
          id: row.id,
          tempKey: row.id,
          label: row.label || '',
          relationship: (row.relationship as TravelerRelationship) || 'other',
          is_default: !!row.is_default,
          traveler_city: row.traveler_city || '',
          traveler_state: row.traveler_state || '',
          first_name: row.first_name || '',
          last_name: row.last_name || '',
          date_of_birth: row.date_of_birth || '',
          gender: (row.gender as TravelerGender) || 'unspecified',
          nationality: row.nationality || '',
          passport_number: row.passport_number || '',
          passport_expiry: row.passport_expiry || '',
          issuing_country: row.issuing_country || '',
          phone: row.phone || '',
          email: row.email || '',
          known_traveler_number: row.known_traveler_number || '',
          meal_preference: row.meal_preference || '',
          special_assistance: row.special_assistance || '',
        }));

        setTravelers(mappedTravelers.length > 0 ? mappedTravelers : [createEmptyTraveler()]);
        setInitialTravelerIds(mappedTravelers.map((item) => item.id).filter(Boolean) as string[]);
      }

      setIsLoading(false);
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!cities.length) return;
    if (!accountForm.city) {
      setSelectedCityId('');
      return;
    }

    const matched = cities.find((city) => {
      const sameCity = (city.name || '').toLowerCase() === accountForm.city.toLowerCase();
      if (!sameCity) return false;

      if (!accountForm.state) return true;
      return ((city.state || '').toLowerCase() || '') === accountForm.state.toLowerCase();
    });

    setSelectedCityId(matched ? String(matched.id) : '');
  }, [cities, accountForm.city, accountForm.state]);

  const updateAccountField = (field: keyof AccountFormState, value: string) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCitySelect = (cityId: string) => {
    setSelectedCityId(cityId);

    if (!cityId) {
      setAccountForm((prev) => ({ ...prev, city: '', state: '' }));
      return;
    }

    const selectedCity = cities.find((city) => String(city.id) === cityId);
    if (!selectedCity) return;

    setAccountForm((prev) => ({
      ...prev,
      city: selectedCity.name || '',
      state: selectedCity.state || '',
    }));
  };

  const updateTravelerField = (
    tempKey: string,
    field: keyof TravelerFormState,
    value: string | boolean
  ) => {
    setTravelers((prev) =>
      prev.map((traveler) =>
        traveler.tempKey === tempKey ? { ...traveler, [field]: value } : traveler
      )
    );
  };

  const getCityIdFromNames = (cityName: string, stateName: string) => {
    if (!cityName) return '';
    const foundCity = cities.find((city) => {
      const sameCity = (city.name || '').toLowerCase() === cityName.toLowerCase();
      if (!sameCity) return false;
      if (!stateName) return true;
      return ((city.state || '').toLowerCase() || '') === stateName.toLowerCase();
    });

    return foundCity ? String(foundCity.id) : '';
  };

  const handleTravelerCitySelect = (tempKey: string, cityId: string) => {
    if (!cityId) {
      setTravelers((prev) =>
        prev.map((traveler) =>
          traveler.tempKey === tempKey
            ? { ...traveler, traveler_city: '', traveler_state: '' }
            : traveler
        )
      );
      return;
    }

    const selectedCity = cities.find((city) => String(city.id) === cityId);
    if (!selectedCity) return;

    setTravelers((prev) =>
      prev.map((traveler) =>
        traveler.tempKey === tempKey
          ? {
              ...traveler,
              traveler_city: selectedCity.name || '',
              traveler_state: selectedCity.state || '',
            }
          : traveler
      )
    );
  };

  const addTraveler = () => {
    setTravelers((prev) => [...prev, createEmptyTraveler()]);
  };

  const removeTraveler = (tempKey: string) => {
    setDeletePendingKey(tempKey);
  };

  const confirmDeleteTraveler = async () => {
    if (!deletePendingKey) return;
    const tempKey = deletePendingKey;
    setDeletePendingKey(null);

    const traveler = travelers.find((t) => t.tempKey === tempKey);
    if (traveler?.id) {
      const { error } = await supabase.from('traveler_profiles').delete().eq('id', traveler.id);
      if (error) {
        toast.error(`Failed to delete traveler: ${error.message}`);
        return;
      }
      setInitialTravelerIds((prev) => prev.filter((id) => id !== traveler.id));
    }

    setTravelers((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((t) => t.tempKey !== tempKey);
    });
    setCollapsedTravelerKeys((prev) => prev.filter((key) => key !== tempKey));
  };

  const toggleTravelerCard = (tempKey: string) => {
    setCollapsedTravelerKeys((prev) =>
      prev.includes(tempKey) ? prev.filter((key) => key !== tempKey) : [...prev, tempKey]
    );
  };

  const persistUserProfileUrl = async (url: string) => {
    if (!authUserId) return;

    const { data: existingDetails, error: existingDetailsError } = await supabase
      .from('user_details')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (existingDetailsError) {
      toast.error(`Failed to save profile image: ${existingDetailsError.message}`);
      return;
    }

    if (existingDetails?.id) {
      const { error: updateError } = await supabase
        .from('user_details')
        .update({ profile_image: url })
        .eq('auth_user_id', authUserId);

      if (updateError) {
        toast.error(`Failed to save profile image: ${updateError.message}`);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('user_details').insert({
        auth_user_id: authUserId,
        user_type: 'user',
        profile_image: url,
      });

      if (insertError) {
        toast.error(`Failed to save profile image: ${insertError.message}`);
        return;
      }
    }
  };

  const handleSave = async () => {
    if (!authUserId || isSaving) return;

    setIsSaving(true);

    const trimmedDetails = {
      first_name: accountForm.first_name.trim(),
      last_name: accountForm.last_name.trim(),
      city: accountForm.city.trim(),
      state: accountForm.state.trim(),
      address: accountForm.address.trim(),
      phone: accountForm.phone.trim(),
      date_of_birth: accountForm.date_of_birth || null,
      gender: accountForm.gender,
      profile_image: userProfileUrl.trim() || null,
    };

    const { data: existingDetails, error: existingDetailsError } = await supabase
      .from('user_details')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (existingDetailsError) {
      toast.error(`Failed to save account details: ${existingDetailsError.message}`);
      setIsSaving(false);
      return;
    }

    if (existingDetails?.id) {
      const { error: updateError } = await supabase
        .from('user_details')
        .update(trimmedDetails)
        .eq('auth_user_id', authUserId);

      if (updateError) {
        toast.error(`Failed to save account details: ${updateError.message}`);
        setIsSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('user_details').insert({
        auth_user_id: authUserId,
        user_type: 'user',
        ...trimmedDetails,
      });

      if (insertError) {
        toast.error(`Failed to save account details: ${insertError.message}`);
        setIsSaving(false);
        return;
      }
    }

    const normalizedTravelers = travelers
      .map((traveler) => ({
        ...traveler,
        label: traveler.label.trim(),
        traveler_city: traveler.traveler_city.trim(),
        traveler_state: traveler.traveler_state.trim(),
        first_name: traveler.first_name.trim(),
        last_name: traveler.last_name.trim(),
        date_of_birth: traveler.date_of_birth || null,
        nationality: traveler.nationality.trim(),
        passport_number: traveler.passport_number.trim(),
        passport_expiry: traveler.passport_expiry || null,
        issuing_country: traveler.issuing_country.trim(),
        phone: traveler.phone.trim(),
        email: traveler.email.trim(),
        known_traveler_number: traveler.known_traveler_number.trim(),
        meal_preference: traveler.meal_preference.trim(),
        special_assistance: traveler.special_assistance.trim(),
      }))
      .filter(
        (traveler) => !isTravelerEmpty({ ...traveler, date_of_birth: traveler.date_of_birth || '' })
      );

    const currentTravelerIds = normalizedTravelers
      .map((traveler) => traveler.id)
      .filter(Boolean) as string[];

    const removedTravelerIds = initialTravelerIds.filter((id) => !currentTravelerIds.includes(id));
    if (removedTravelerIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('traveler_profiles')
        .delete()
        .in('id', removedTravelerIds)
        .eq('auth_user_id', authUserId);

      if (deleteError) {
        toast.error(`Failed to remove old travelers: ${deleteError.message}`);
        setIsSaving(false);
        return;
      }
    }

    const existingRows = normalizedTravelers.filter((traveler) => !!traveler.id);
    const newRows = normalizedTravelers.filter((traveler) => !traveler.id);

    if (existingRows.length > 0) {
      const updatePromises = existingRows.map((traveler) =>
        supabase
          .from('traveler_profiles')
          .update({
            label: traveler.label,
            relationship: traveler.relationship,
            is_default: traveler.is_default,
            traveler_city: traveler.traveler_city,
            traveler_state: traveler.traveler_state,
            first_name: traveler.first_name,
            last_name: traveler.last_name,
            date_of_birth: traveler.date_of_birth,
            gender: traveler.gender,
            nationality: traveler.nationality,
            passport_number: traveler.passport_number,
            passport_expiry: traveler.passport_expiry,
            issuing_country: traveler.issuing_country,
            phone: traveler.phone,
            email: traveler.email,
            known_traveler_number: traveler.known_traveler_number,
            meal_preference: traveler.meal_preference,
            special_assistance: traveler.special_assistance,
          })
          .eq('id', traveler.id)
          .eq('auth_user_id', authUserId)
      );

      const updateResults = await Promise.all(updatePromises);
      const failedUpdate = updateResults.find((result) => result.error);
      if (failedUpdate?.error) {
        toast.error(`Failed to update traveler: ${failedUpdate.error.message}`);
        setIsSaving(false);
        return;
      }
    }

    if (newRows.length > 0) {
      const { error: insertTravelersError } = await supabase.from('traveler_profiles').insert(
        newRows.map((traveler) => ({
          auth_user_id: authUserId,
          label: traveler.label,
          relationship: traveler.relationship,
          is_default: traveler.is_default,
          traveler_city: traveler.traveler_city,
          traveler_state: traveler.traveler_state,
          first_name: traveler.first_name,
          last_name: traveler.last_name,
          date_of_birth: traveler.date_of_birth,
          gender: traveler.gender,
          nationality: traveler.nationality,
          passport_number: traveler.passport_number,
          passport_expiry: traveler.passport_expiry,
          issuing_country: traveler.issuing_country,
          phone: traveler.phone,
          email: traveler.email,
          known_traveler_number: traveler.known_traveler_number,
          meal_preference: traveler.meal_preference,
          special_assistance: traveler.special_assistance,
        }))
      );

      if (insertTravelersError) {
        toast.error(`Failed to create traveler: ${insertTravelersError.message}`);
        setIsSaving(false);
        return;
      }
    }

    const { data: refreshedTravelers, error: refreshError } = await supabase
      .from('traveler_profiles')
      .select(
        'id, label, relationship, is_default, traveler_city, traveler_state, first_name, last_name, date_of_birth, gender, nationality, passport_number, passport_expiry, issuing_country, phone, email, known_traveler_number, meal_preference, special_assistance'
      )
      .eq('auth_user_id', authUserId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (refreshError) {
      toast.success('Account updated. Refresh to see latest traveler IDs.');
      setIsSaving(false);
      return;
    }

    const mappedTravelers: TravelerFormState[] = (refreshedTravelers || []).map((row) => ({
      id: row.id,
      tempKey: row.id,
      label: row.label || '',
      relationship: (row.relationship as TravelerRelationship) || 'other',
      is_default: !!row.is_default,
      traveler_city: row.traveler_city || '',
      traveler_state: row.traveler_state || '',
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      date_of_birth: row.date_of_birth || '',
      gender: (row.gender as TravelerGender) || 'unspecified',
      nationality: row.nationality || '',
      passport_number: row.passport_number || '',
      passport_expiry: row.passport_expiry || '',
      issuing_country: row.issuing_country || '',
      phone: row.phone || '',
      email: row.email || '',
      known_traveler_number: row.known_traveler_number || '',
      meal_preference: row.meal_preference || '',
      special_assistance: row.special_assistance || '',
    }));

    setTravelers(mappedTravelers.length > 0 ? mappedTravelers : [createEmptyTraveler()]);
    setInitialTravelerIds(mappedTravelers.map((item) => item.id).filter(Boolean) as string[]);
    toast.success('Account details updated successfully.');
    setIsSaving(false);
  };

  return (
    <div className="gap-8">
      <Toaster position="top-center" />
      {/* HEADING */}
      <h2 className="text-3xl font-semibold">Account information</h2>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {isLoading ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Loading account data...</p>
      ) : (
        <div className="space-y-10">
          <>
            <div className="listingSection__wrap overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label>First Name</Label>
                  <Input
                    className="mt-1.5"
                    value={accountForm.first_name}
                    onChange={(e) => updateAccountField('first_name', e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <Label>Last Name</Label>
                  <Input
                    className="mt-1.5"
                    value={accountForm.last_name}
                    onChange={(e) => updateAccountField('last_name', e.target.value)}
                    placeholder="Enter last name"
                  />
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
                  {accountForm.city && !selectedCityId && (
                    <p className="mt-2 text-xs text-neutral-500">
                      Saved city: {accountForm.city}
                      {accountForm.state ? `, ${accountForm.state}` : ''}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Address</Label>
                  <Input
                    className="mt-1.5"
                    value={accountForm.address}
                    onChange={(e) => updateAccountField('address', e.target.value)}
                    placeholder="Enter address"
                  />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1.5"
                    value={accountForm.phone}
                    onChange={(e) => updateAccountField('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    className="mt-1.5"
                    type="date"
                    value={accountForm.date_of_birth}
                    onChange={(e) => updateAccountField('date_of_birth', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Gender</Label>
                  <Select
                    className="mt-1.5"
                    value={accountForm.gender}
                    onChange={(e) => updateAccountField('gender', e.target.value as TravelerGender)}
                  >
                    <option value="unspecified">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <ImageUpload
                  label="Profile Picture"
                  folder={`users/${authUserId}`}
                  currentImageUrl={userProfileUrl}
                  fixedFileName="profile"
                  onUploadSuccess={(url) => {
                    setUserProfileUrl(url);
                    void persistUserProfileUrl(url);
                  }}
                  aspectRatio="square"
                />
              </div>
            </div>

            <div className="listingSection__wrap space-y-4 overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">Saved Travelers / Family Details</h3>
                <button
                  type="button"
                  onClick={addTraveler}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Add traveler
                </button>
              </div>

              {travelers.map((traveler, index) => (
                <div
                  key={traveler.tempKey}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-lg font-semibold">
                      {[traveler.first_name, traveler.last_name].filter(Boolean).join(' ').trim() ||
                        `Traveler ${index + 1}`}
                    </h4>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTravelerCard(traveler.tempKey)}
                        className="inline-flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                        aria-label={
                          collapsedTravelerKeys.includes(traveler.tempKey)
                            ? 'Expand traveler details'
                            : 'Collapse traveler details'
                        }
                      >
                        {collapsedTravelerKeys.includes(traveler.tempKey) ? (
                          <ChevronDownIcon className="w-5 h-5" />
                        ) : (
                          <ChevronUpIcon className="w-5 h-5" />
                        )}
                      </button>
                      {travelers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTraveler(traveler.tempKey)}
                          className="inline-flex items-center justify-center rounded-xl p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                          aria-label="Delete traveler"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!collapsedTravelerKeys.includes(traveler.tempKey) && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Label</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.label}
                            onChange={(e) =>
                              updateTravelerField(traveler.tempKey, 'label', e.target.value)
                            }
                            placeholder="Wife / Son / Parent"
                          />
                        </div>

                        <div>
                          <Label>Relationship</Label>
                          <Select
                            className="mt-1.5"
                            value={traveler.relationship}
                            onChange={(e) =>
                              updateTravelerField(
                                traveler.tempKey,
                                'relationship',
                                e.target.value as TravelerRelationship
                              )
                            }
                          >
                            <option value="self">Self</option>
                            <option value="spouse">Spouse</option>
                            <option value="child">Child</option>
                            <option value="parent">Parent</option>
                            <option value="other">Other</option>
                          </Select>
                        </div>

                        <div>
                          <Label>Traveler City</Label>
                          <Select
                            className="mt-1.5"
                            value={getCityIdFromNames(
                              traveler.traveler_city,
                              traveler.traveler_state
                            )}
                            onChange={(e) =>
                              handleTravelerCitySelect(traveler.tempKey, e.target.value)
                            }
                            disabled={citiesLoading}
                          >
                            <option value="">
                              {citiesLoading ? 'Loading cities...' : 'Select city'}
                            </option>
                            {cities.map((city) => (
                              <option key={city.id} value={String(city.id)}>
                                {city.name}
                                {city.state ? `, ${city.state}` : ''}
                              </option>
                            ))}
                          </Select>
                          {traveler.traveler_city &&
                            !getCityIdFromNames(
                              traveler.traveler_city,
                              traveler.traveler_state
                            ) && (
                              <p className="mt-2 text-xs text-neutral-500">
                                Saved city: {traveler.traveler_city}
                                {traveler.traveler_state ? `, ${traveler.traveler_state}` : ''}
                              </p>
                            )}
                        </div>

                        <div>
                          <Label>Traveler State</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.traveler_state}
                            readOnly
                            placeholder="Auto from city"
                          />
                        </div>

                        <div>
                          <Label>First Name</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.first_name}
                            onChange={(e) =>
                              updateTravelerField(traveler.tempKey, 'first_name', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <Label>Last Name</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.last_name}
                            onChange={(e) =>
                              updateTravelerField(traveler.tempKey, 'last_name', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <Label>Date of Birth</Label>
                          <Input
                            className="mt-1.5"
                            type="date"
                            value={traveler.date_of_birth}
                            onChange={(e) =>
                              updateTravelerField(traveler.tempKey, 'date_of_birth', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <Label>Gender</Label>
                          <Select
                            className="mt-1.5"
                            value={traveler.gender}
                            onChange={(e) =>
                              updateTravelerField(
                                traveler.tempKey,
                                'gender',
                                e.target.value as TravelerGender
                              )
                            }
                          >
                            <option value="unspecified">Prefer not to say</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </Select>
                        </div>

                        <div>
                          <Label>Nationality</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.nationality}
                            onChange={(e) =>
                              updateTravelerField(traveler.tempKey, 'nationality', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <Label>Passport Number</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.passport_number}
                            onChange={(e) =>
                              updateTravelerField(
                                traveler.tempKey,
                                'passport_number',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <Label>Passport Expiry</Label>
                          <Input
                            className="mt-1.5"
                            type="date"
                            value={traveler.passport_expiry}
                            onChange={(e) =>
                              updateTravelerField(
                                traveler.tempKey,
                                'passport_expiry',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <Label>Issuing Country</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.issuing_country}
                            onChange={(e) =>
                              updateTravelerField(
                                traveler.tempKey,
                                'issuing_country',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <Label>Phone</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.phone}
                            onChange={(e) =>
                              updateTravelerField(traveler.tempKey, 'phone', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <Label>Email</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.email}
                            onChange={(e) =>
                              updateTravelerField(traveler.tempKey, 'email', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <Label>Known Traveler Number</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.known_traveler_number}
                            onChange={(e) =>
                              updateTravelerField(
                                traveler.tempKey,
                                'known_traveler_number',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <Label>Meal Preference</Label>
                          <Input
                            className="mt-1.5"
                            value={traveler.meal_preference}
                            onChange={(e) =>
                              updateTravelerField(
                                traveler.tempKey,
                                'meal_preference',
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Special Assistance</Label>
                        <Textarea
                          className="mt-1.5"
                          value={traveler.special_assistance}
                          onChange={(e) =>
                            updateTravelerField(
                              traveler.tempKey,
                              'special_assistance',
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={traveler.is_default}
                          onChange={(e) =>
                            updateTravelerField(traveler.tempKey, 'is_default', e.target.checked)
                          }
                        />
                        Set as default traveler
                      </label>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>

          <div className="pt-2">
            <ButtonPrimary disabled={!canSave} onClick={handleSave}>
              {isSaving ? 'Saving...' : 'Update info'}
            </ButtonPrimary>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Transition appear show={!!deletePendingKey} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setDeletePendingKey(null)}
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
                  <Dialog.Title className="text-lg font-semibold">Delete Traveler</Dialog.Title>
                  <button
                    type="button"
                    onClick={() => setDeletePendingKey(null)}
                    className="inline-flex items-center justify-center rounded-xl p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Are you sure you want to delete this traveler? This action cannot be undone.
                </p>
                <div className="mt-6 flex gap-3 justify-end">
                  <ButtonSecondary
                    type="button"
                    onClick={() => setDeletePendingKey(null)}
                    className="!text-sm"
                  >
                    Cancel
                  </ButtonSecondary>
                  <ButtonPrimary
                    type="button"
                    onClick={confirmDeleteTraveler}
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

export default AccountPage;
