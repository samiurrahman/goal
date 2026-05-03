'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import NcModal from '@/shared/NcModal';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonSecondary from '@/shared/ButtonSecondary';
import Label from '@/components/Label';
import Input from '@/shared/Input';
import Textarea from '@/shared/Textarea';
import Select from '@/shared/Select';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/utils/supabaseClient';
import { uploadImageToStorage } from '@/utils/supabaseStorageHelper';
import { useCities } from '@/hooks/useCities';

type WizardStep = 'meta' | 'itinerary' | 'amenities' | 'stay' | 'policies' | 'media';

interface IternaryItemInput {
  fromDate: string;
  fromLocation: string;
  toDate: string;
  toLocation: string;
  tripTime: string;
  flightInfo: string;
  nextLegLabel?: string;
}

interface AddPackageWizardModalProps {
  agentAuthUserId: string;
  agentSlug: string;
  onCreated: () => void;
  editPackageId?: number;
  triggerLabel?: string;
  triggerContent?: React.ReactNode;
  triggerClassName?: string;
}

interface PackageMetaForm {
  title: string;
  slug: string;
  type: string;
  short_description: string;
  price_per_person: string;
  currency: string;
  total_duration_days: string;
  makkah_days: string;
  madinah_days: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  arrival_date: string;
  location: string;
  package_location: string;
  makkah_hotel_name: string;
  makkah_hotel_distance_m: string;
  madinah_hotel_name: string;
  madinah_hotel_distance_m: string;
}

interface SharingRateItem {
  people: number;
  value: string;
  default: boolean;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const runCommand = (command: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false);
    onChange(editorRef.current.innerHTML);
  };

  const toolbarButtonClass =
    'rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('bold')}
        >
          Bold
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('italic')}
        >
          Italic
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('insertUnorderedList')}
        >
          Bullets
        </button>
      </div>
      <div
        ref={editorRef}
        className="min-h-[220px] w-full rounded-2xl border border-neutral-200 bg-white p-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        data-placeholder={placeholder || ''}
      />
    </div>
  );
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const initialMetaForm: PackageMetaForm = {
  title: '',
  slug: '',
  type: 'UMRAH',
  short_description: '',
  price_per_person: '',
  currency: 'INR',
  total_duration_days: '',
  makkah_days: '',
  madinah_days: '',
  departure_city: '',
  arrival_city: '',
  departure_date: '',
  arrival_date: '',
  location: '',
  package_location: '',
  makkah_hotel_name: '',
  makkah_hotel_distance_m: '',
  madinah_hotel_name: '',
  madinah_hotel_distance_m: '',
};

const makeEmptyIternaryItem = (): IternaryItemInput => ({
  fromDate: '',
  fromLocation: '',
  toDate: '',
  toLocation: '',
  tripTime: '',
  flightInfo: '',
  nextLegLabel: '',
});

const AddPackageWizardModal = ({
  agentAuthUserId,
  agentSlug,
  onCreated,
  editPackageId,
  triggerLabel,
  triggerContent,
  triggerClassName,
}: AddPackageWizardModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [isDraftPackage, setIsDraftPackage] = useState(false);
  const [step, setStep] = useState<WizardStep>('meta');

  const [meta, setMeta] = useState<PackageMetaForm>(initialMetaForm);
  const [sharingRates, setSharingRates] = useState<SharingRateItem[]>([
    { people: 2, value: '', default: false },
    { people: 3, value: '', default: false },
    { people: 4, value: '', default: false },
    { people: 5, value: '', default: true },
  ]);
  const [iternaryItems, setIternaryItems] = useState<IternaryItemInput[]>([
    makeEmptyIternaryItem(),
    makeEmptyIternaryItem(),
  ]);
  const [amenitiesText, setAmenitiesText] = useState('');
  const [stayInfoContentHtml, setStayInfoContentHtml] = useState('');
  const [policyCancellation, setPolicyCancellation] = useState('');
  const [policyCheckIn, setPolicyCheckIn] = useState('');
  const [policyCheckOut, setPolicyCheckOut] = useState('');
  const [policyNotesText, setPolicyNotesText] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const { data: citiesData, isLoading: citiesLoading } = useCities();

  const steps: WizardStep[] = ['meta', 'itinerary', 'amenities', 'stay', 'policies', 'media'];
  const currentStepIndex = steps.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const stepTitle = useMemo(() => {
    const labels: Record<WizardStep, string> = {
      meta: 'Package Meta',
      itinerary: 'Iternary',
      amenities: 'Amenities',
      stay: 'Stay Information',
      policies: 'Things To Know',
      media: 'Media & Publish',
    };
    return labels[step];
  }, [step]);

  const cityOptions = useMemo(() => {
    if (!Array.isArray(citiesData)) return [] as string[];

    const values = citiesData
      .map((city) => {
        const row = city as Record<string, unknown>;
        return String(row.name || row.city || row.city_name || '').trim();
      })
      .filter(Boolean);

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [citiesData]);

  const closeModal = () => {
    if (isSaving) return;
    setIsOpen(false);
  };

  const parseIternary = (value: unknown): IternaryItemInput[] => {
    let source: unknown = value;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch {
        source = [];
      }
    }

    if (!Array.isArray(source)) return [makeEmptyIternaryItem(), makeEmptyIternaryItem()];
    const mapped = source.map((item) => {
      const row = (item || {}) as Record<string, unknown>;
      return {
        fromDate: String(row.fromDate || ''),
        fromLocation: String(row.fromLocation || ''),
        toDate: String(row.toDate || ''),
        toLocation: String(row.toLocation || ''),
        tripTime: String(row.tripTime || ''),
        flightInfo: String(row.flightInfo || ''),
        nextLegLabel: String(
          row.nextLegLabel || row.next_leg_label || row.separatorLabel || row.next_label || ''
        ),
      };
    });
    return mapped.length > 0 ? mapped : [makeEmptyIternaryItem(), makeEmptyIternaryItem()];
  };

  const parseAmenitiesText = (value: unknown): string => {
    let source: unknown = value;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch {
        source = [];
      }
    }

    if (Array.isArray(source)) {
      return source
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'name' in (item as Record<string, unknown>)) {
            return String((item as Record<string, unknown>).name || '');
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    return '';
  };

  const prefillForEdit = async () => {
    if (!editPackageId) return;

    setIsLoadingPackage(true);

    const { data: packageRow, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', editPackageId)
      .single();

    if (packageError || !packageRow) {
      setIsLoadingPackage(false);
      toast.error('Failed to load package for edit.');
      return;
    }

    const { data: detailsRow } = await supabase
      .from('package_details')
      .select('*')
      .eq('package_id', editPackageId)
      .maybeSingle();

    const parsedRates = (() => {
      const fallback = [
        { people: 2, value: '', default: false },
        { people: 3, value: '', default: false },
        { people: 4, value: '', default: false },
        { people: 5, value: '', default: true },
      ];

      const detailRates =
        (detailsRow?.purchase_summary as { rates?: unknown } | undefined)?.rates ?? [];
      if (Array.isArray(detailRates) && detailRates.length > 0) {
        return detailRates.map((rate: Record<string, unknown>) => ({
          people: Number(rate.people || 0),
          value: String(rate.value || ''),
          default: Boolean(rate.default),
        }));
      }

      try {
        const raw = packageRow.sharing_rate;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const rates = parsed?.json?.rates ?? parsed?.rates ?? [];
        if (!Array.isArray(rates) || rates.length === 0) return fallback;
        return rates.map((rate: Record<string, unknown>) => ({
          people: Number(rate.people || 0),
          value: String(rate.value || ''),
          default: Boolean(rate.default),
        }));
      } catch {
        return fallback;
      }
    })();

    setMeta({
      title: String(packageRow.title || ''),
      slug: slugify(String(packageRow.title || '')),
      type: String(packageRow.type || 'UMRAH'),
      short_description: String(packageRow.short_description || ''),
      price_per_person: String(packageRow.price_per_person ?? ''),
      currency: String(packageRow.currency || 'INR'),
      total_duration_days: String(packageRow.total_duration_days ?? ''),
      makkah_days: String(packageRow.makkah_days ?? ''),
      madinah_days: String(packageRow.madinah_days ?? ''),
      departure_city: String(packageRow.departure_city || ''),
      arrival_city: String(packageRow.arrival_city || ''),
      departure_date: packageRow.departure_date
        ? String(packageRow.departure_date).slice(0, 10)
        : '',
      arrival_date: packageRow.arrival_date ? String(packageRow.arrival_date).slice(0, 10) : '',
      location: String(packageRow.location || ''),
      package_location: String(packageRow.package_location || ''),
      makkah_hotel_name: String(packageRow.makkah_hotel_name || ''),
      makkah_hotel_distance_m: String(packageRow.makkah_hotel_distance_m ?? ''),
      madinah_hotel_name: String(packageRow.madinah_hotel_name || ''),
      madinah_hotel_distance_m: String(packageRow.madinah_hotel_distance_m ?? ''),
    });
    setSharingRates(parsedRates);
    setIternaryItems(parseIternary(detailsRow?.iternary));
    setAmenitiesText(parseAmenitiesText(detailsRow?.amenities));
    const stayInfoRow = (() => {
      const raw = detailsRow?.stay_information;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return {} as Record<string, unknown>;
        }
      }
      return (raw || {}) as Record<string, unknown>;
    })();
    const legacyLines: string[] = Array.isArray(stayInfoRow?.details)
      ? (stayInfoRow.details as unknown[]).map((line: unknown) => String(line || ''))
      : [];
    const legacyHtml = legacyLines.length
      ? `<ul>${legacyLines.map((line: string) => `<li>${line}</li>`).join('')}</ul>`
      : '';
    setStayInfoContentHtml(
      String(
        stayInfoRow.content_html || stayInfoRow.contentHtml || stayInfoRow.content || legacyHtml
      )
    );

    const policiesRow = (() => {
      const raw = detailsRow?.policies;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return {} as Record<string, unknown>;
        }
      }
      return (raw || {}) as Record<string, unknown>;
    })();
    setPolicyCancellation(
      String(policiesRow.cancellation || policiesRow.cancellation_policy || '')
    );
    setPolicyCheckIn(
      String(policiesRow.checkIn || policiesRow.check_in || policiesRow.checkin || '')
    );
    setPolicyCheckOut(
      String(policiesRow.checkOut || policiesRow.check_out || policiesRow.checkout || '')
    );
    setPolicyNotesText(
      Array.isArray(policiesRow.notes)
        ? (policiesRow.notes as unknown[]).map((line: unknown) => String(line || '')).join('\n')
        : Array.isArray(policiesRow.special_notes)
          ? (policiesRow.special_notes as unknown[])
              .map((line: unknown) => String(line || ''))
              .join('\n')
          : ''
    );
    setCurrentImageUrl(packageRow.thumbnail_url || undefined);
    setPendingImageFile(null);
    setIsDraftPackage(packageRow.published === false);
    setIsLoadingPackage(false);
  };

  const resetForm = () => {
    setMeta(initialMetaForm);
    setSharingRates([
      { people: 2, value: '', default: false },
      { people: 3, value: '', default: false },
      { people: 4, value: '', default: false },
      { people: 5, value: '', default: true },
    ]);
    setIternaryItems([makeEmptyIternaryItem(), makeEmptyIternaryItem()]);
    setAmenitiesText('');
    setStayInfoContentHtml('');
    setPolicyCancellation('');
    setPolicyCheckIn('');
    setPolicyCheckOut('');
    setPolicyNotesText('');
    setPendingImageFile(null);
    setIsDraftPackage(false);
    setStep('meta');
  };

  const goNext = () => {
    if (isLastStep) return;
    setStep(steps[currentStepIndex + 1]);
  };

  const goBack = () => {
    if (isFirstStep) return;
    setStep(steps[currentStepIndex - 1]);
  };

  const parseLines = (value: string): string[] =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  const handleMetaChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'slug') {
      // Slug is auto-generated from title in background.
      return;
    }

    setMeta((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'title') {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handlePublish = async () => {
    if (!meta.title.trim()) {
      toast.error('Title is required.');
      setStep('meta');
      return;
    }

    const packageSlug = slugify(meta.title);
    if (!packageSlug) {
      toast.error('Slug is invalid.');
      setStep('meta');
      return;
    }

    setIsSaving(true);

    const normalizedRates = sharingRates
      .filter((rate) => Number(rate.value) > 0)
      .map((rate) => ({
        value: String(rate.value).trim(),
        people: rate.people,
        default: rate.default,
      }));

    const selectedRates =
      normalizedRates.length > 0
        ? normalizedRates
        : [
            {
              value: meta.price_per_person || '0',
              people: 5,
              default: true,
            },
          ];

    if (!selectedRates.some((rate) => rate.default)) {
      selectedRates[0].default = true;
    }

    const defaultSelectedRate = selectedRates.find((rate) => rate.default) ?? selectedRates[0];
    const defaultPriceValue = Number(defaultSelectedRate?.value || meta.price_per_person || 0);
    const defaultSharePeople = Number(defaultSelectedRate?.people || 5);

    const packagePayload = {
      title: meta.title.trim(),
      slug: packageSlug,
      type: 'UMRAH',
      short_description: meta.short_description.trim() || null,
      price_per_person: defaultPriceValue,
      currency: 'INR',
      total_duration_days: Number(meta.total_duration_days || 0),
      makkah_days: Number(meta.makkah_days || 0),
      madinah_days: Number(meta.madinah_days || 0),
      departure_city: meta.departure_city.trim() || null,
      arrival_city: meta.arrival_city.trim() || null,
      departure_date: meta.departure_date || null,
      arrival_date: meta.arrival_date || null,
      location: meta.location.trim() || null,
      package_location: meta.package_location.trim() || null,
      makkah_hotel_name: meta.makkah_hotel_name.trim() || null,
      makkah_hotel_distance_m: Number(meta.makkah_hotel_distance_m || 0),
      madinah_hotel_name: meta.madinah_hotel_name.trim() || null,
      madinah_hotel_distance_m: Number(meta.madinah_hotel_distance_m || 0),
      sharing_rate: null,
      default_pricing: {
        people: defaultSharePeople,
        value: defaultPriceValue,
        currency: 'INR',
      },
      agent_id: agentAuthUserId,
      agent_name: agentSlug,
      published: editPackageId ? true : true,
      thumbnail_url: editPackageId ? currentImageUrl || null : null,
    };

    const { data: packageData, error: packageError } = editPackageId
      ? await supabase
          .from('packages')
          .update(packagePayload)
          .eq('id', editPackageId)
          .select()
          .single()
      : await supabase.from('packages').insert([packagePayload]).select().single();

    if (packageError || !packageData) {
      setIsSaving(false);
      toast.error('Failed to create package: ' + (packageError?.message || 'Unknown error'));
      return;
    }

    let finalThumbnailUrl: string | null = null;
    if (pendingImageFile) {
      const imageUpload = await uploadImageToStorage(
        pendingImageFile,
        `agents/${agentAuthUserId}/packages/${packageData.id}`,
        undefined,
        { fixedFileName: 'image' }
      );
      if (imageUpload.error) {
        toast.error('Image upload failed: ' + imageUpload.error);
      } else {
        finalThumbnailUrl = imageUpload.url;
      }
    }

    if (finalThumbnailUrl) {
      await supabase
        .from('packages')
        .update({ thumbnail_url: finalThumbnailUrl })
        .eq('id', packageData.id);
      setCurrentImageUrl(finalThumbnailUrl);
    }

    const packageDetailsPayload = {
      package_id: packageData.id,
      iternary: iternaryItems.filter(
        (item) =>
          item.fromDate ||
          item.fromLocation ||
          item.toDate ||
          item.toLocation ||
          item.tripTime ||
          item.flightInfo
      ),
      stay_information: {
        title: 'Stay information',
        details: [],
        content_html: stayInfoContentHtml.trim(),
      },
      purchase_summary: {
        rates: selectedRates,
        currency: 'INR',
        min_guests: 1,
        max_guests: 20,
      },
      amenities: parseLines(amenitiesText).map((name) => ({ name })),
      policies: {
        cancellation: policyCancellation.trim(),
        checkIn: policyCheckIn.trim(),
        checkOut: policyCheckOut.trim(),
        notes: parseLines(policyNotesText),
      },
    };

    const { data: existingDetails } = await supabase
      .from('package_details')
      .select('id')
      .eq('package_id', packageData.id)
      .maybeSingle();

    const { error: detailsError } = existingDetails?.id
      ? await supabase
          .from('package_details')
          .update(packageDetailsPayload)
          .eq('id', existingDetails.id)
      : await supabase.from('package_details').insert(packageDetailsPayload);

    setIsSaving(false);

    if (detailsError) {
      toast.error('Package saved, but details failed: ' + detailsError.message);
      onCreated();
      closeModal();
      return;
    }

    toast.success(
      editPackageId
        ? isDraftPackage
          ? 'Package published successfully!'
          : 'Package updated successfully!'
        : 'Package created successfully!'
    );
    onCreated();
    closeModal();
    resetForm();
  };

  return (
    <NcModal
      isOpenProp={isOpen}
      onCloseModal={closeModal}
      modalTitle={`${editPackageId ? 'Edit Package' : 'Add New Package'} • ${stepTitle}`}
      contentExtraClass="max-w-5xl"
      contentPaddingClass="px-4 pb-5 pt-4 md:px-6 md:pb-6"
      renderTrigger={(openModal) => (
        <button
          type="button"
          className={
            triggerClassName ||
            (editPackageId
              ? 'px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs'
              : 'nc-ButtonPrimary relative h-auto inline-flex items-center justify-center rounded-full transition-colors px-4 py-3 sm:px-6 ttnc-ButtonPrimary disabled:bg-opacity-70 bg-primary-6000 hover:bg-primary-700 text-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-6000 dark:focus:ring-offset-0')
          }
          onClick={async () => {
            resetForm();
            if (editPackageId) {
              await prefillForEdit();
            }
            setIsOpen(true);
            openModal();
          }}
        >
          {triggerContent ?? triggerLabel ?? (editPackageId ? 'Edit' : 'Add New Package')}
        </button>
      )}
      renderContent={() => (
        <div className="space-y-5">
          {isLoadingPackage ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Loading package data...
            </p>
          ) : (
            <>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Step {currentStepIndex + 1} of {steps.length}
              </div>

              <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-5">
                {step === 'meta' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Title</Label>
                      <Input
                        name="title"
                        className="mt-1.5"
                        value={meta.title}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Short Description</Label>
                      <Textarea
                        name="short_description"
                        className="mt-1.5"
                        value={meta.short_description}
                        onChange={handleMetaChange}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Price Per Person</Label>
                      <Input
                        name="price_per_person"
                        type="number"
                        className="mt-1.5"
                        value={meta.price_per_person}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div>
                      <Label>Total Days</Label>
                      <Input
                        name="total_duration_days"
                        type="number"
                        className="mt-1.5"
                        value={meta.total_duration_days}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Makkah Days</Label>
                        <Input
                          name="makkah_days"
                          type="number"
                          className="mt-1.5"
                          value={meta.makkah_days}
                          onChange={handleMetaChange}
                        />
                      </div>
                      <div>
                        <Label>Madinah Days</Label>
                        <Input
                          name="madinah_days"
                          type="number"
                          className="mt-1.5"
                          value={meta.madinah_days}
                          onChange={handleMetaChange}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Departure City</Label>
                        <Select
                          name="departure_city"
                          className="mt-1.5"
                          value={meta.departure_city}
                          onChange={handleMetaChange}
                          disabled={citiesLoading}
                        >
                          <option value="">Select departure city</option>
                          {meta.departure_city && !cityOptions.includes(meta.departure_city) ? (
                            <option value={meta.departure_city}>{meta.departure_city}</option>
                          ) : null}
                          {cityOptions.map((city) => (
                            <option key={`departure-${city}`} value={city}>
                              {city}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>Arrival City</Label>
                        <Select
                          name="arrival_city"
                          className="mt-1.5"
                          value={meta.arrival_city}
                          onChange={handleMetaChange}
                          disabled={citiesLoading}
                        >
                          <option value="">Select arrival city</option>
                          {meta.arrival_city && !cityOptions.includes(meta.arrival_city) ? (
                            <option value={meta.arrival_city}>{meta.arrival_city}</option>
                          ) : null}
                          {cityOptions.map((city) => (
                            <option key={`arrival-${city}`} value={city}>
                              {city}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Departure Date</Label>
                      <Input
                        name="departure_date"
                        type="date"
                        className="mt-1.5"
                        value={meta.departure_date}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div>
                      <Label>Arrival Date</Label>
                      <Input
                        name="arrival_date"
                        type="date"
                        className="mt-1.5"
                        value={meta.arrival_date}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        name="location"
                        className="mt-1.5"
                        value={meta.location}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div>
                      <Label>Package Location</Label>
                      <Input
                        name="package_location"
                        className="mt-1.5"
                        value={meta.package_location}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div>
                      <Label>Makkah Hotel Name</Label>
                      <Input
                        name="makkah_hotel_name"
                        className="mt-1.5"
                        value={meta.makkah_hotel_name}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div>
                      <Label>Makkah Hotel Distance (m)</Label>
                      <Input
                        name="makkah_hotel_distance_m"
                        type="number"
                        className="mt-1.5"
                        value={meta.makkah_hotel_distance_m}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div>
                      <Label>Madinah Hotel Name</Label>
                      <Input
                        name="madinah_hotel_name"
                        className="mt-1.5"
                        value={meta.madinah_hotel_name}
                        onChange={handleMetaChange}
                      />
                    </div>
                    <div>
                      <Label>Madinah Hotel Distance (m)</Label>
                      <Input
                        name="madinah_hotel_distance_m"
                        type="number"
                        className="mt-1.5"
                        value={meta.madinah_hotel_distance_m}
                        onChange={handleMetaChange}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <Label>Sharing Rates</Label>
                      {sharingRates.map((rate, idx) => (
                        <div
                          key={rate.people}
                          className="grid grid-cols-[80px_1fr_auto] gap-3 items-center"
                        >
                          <span className="text-sm text-neutral-600">{rate.people} Share</span>
                          <Input
                            type="number"
                            value={rate.value}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSharingRates((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, value } : item))
                              );
                            }}
                          />
                          <button
                            type="button"
                            className={`text-xs px-3 py-2 rounded-full border ${
                              rate.default
                                ? 'border-green-600 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300'
                                : 'border-neutral-300 text-neutral-600'
                            }`}
                            onClick={() => {
                              setSharingRates((prev) =>
                                prev.map((item, i) => ({ ...item, default: i === idx }))
                              );
                            }}
                          >
                            <span className="inline-flex items-center gap-1">
                              {rate.default ? <i className="las la-check-circle text-sm" /> : null}
                              {rate.default ? 'Default' : 'Set Default'}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 'itinerary' && (
                  <div className="space-y-4">
                    {iternaryItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Iternary Segment {idx + 1}</h4>
                          {iternaryItems.length > 1 && (
                            <button
                              type="button"
                              className="text-xs text-red-600"
                              onClick={() => {
                                setIternaryItems((prev) => prev.filter((_, i) => i !== idx));
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            placeholder="From Date"
                            value={item.fromDate}
                            onChange={(e) => {
                              const value = e.target.value;
                              setIternaryItems((prev) =>
                                prev.map((entry, i) =>
                                  i === idx ? { ...entry, fromDate: value } : entry
                                )
                              );
                            }}
                          />
                          <Input
                            placeholder="From Location"
                            value={item.fromLocation}
                            onChange={(e) => {
                              const value = e.target.value;
                              setIternaryItems((prev) =>
                                prev.map((entry, i) =>
                                  i === idx ? { ...entry, fromLocation: value } : entry
                                )
                              );
                            }}
                          />
                          <Input
                            placeholder="To Date"
                            value={item.toDate}
                            onChange={(e) => {
                              const value = e.target.value;
                              setIternaryItems((prev) =>
                                prev.map((entry, i) =>
                                  i === idx ? { ...entry, toDate: value } : entry
                                )
                              );
                            }}
                          />
                          <Input
                            placeholder="To Location"
                            value={item.toLocation}
                            onChange={(e) => {
                              const value = e.target.value;
                              setIternaryItems((prev) =>
                                prev.map((entry, i) =>
                                  i === idx ? { ...entry, toLocation: value } : entry
                                )
                              );
                            }}
                          />
                          <Input
                            placeholder="Trip Time"
                            value={item.tripTime}
                            onChange={(e) => {
                              const value = e.target.value;
                              setIternaryItems((prev) =>
                                prev.map((entry, i) =>
                                  i === idx ? { ...entry, tripTime: value } : entry
                                )
                              );
                            }}
                          />
                          <Input
                            placeholder="Flight Info"
                            value={item.flightInfo}
                            onChange={(e) => {
                              const value = e.target.value;
                              setIternaryItems((prev) =>
                                prev.map((entry, i) =>
                                  i === idx ? { ...entry, flightInfo: value } : entry
                                )
                              );
                            }}
                          />
                          <Input
                            placeholder="Next Leg Label (for separator)"
                            value={item.nextLegLabel || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setIternaryItems((prev) =>
                                prev.map((entry, i) =>
                                  i === idx ? { ...entry, nextLegLabel: value } : entry
                                )
                              );
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    <ButtonSecondary
                      type="button"
                      onClick={() => setIternaryItems((prev) => [...prev, makeEmptyIternaryItem()])}
                    >
                      Add Iternary Segment
                    </ButtonSecondary>
                  </div>
                )}

                {step === 'amenities' && (
                  <div>
                    <Label>Amenities (one per line)</Label>
                    <Textarea
                      className="mt-1.5"
                      rows={10}
                      value={amenitiesText}
                      onChange={(e) => setAmenitiesText(e.target.value)}
                      placeholder={'Meals\nVisa\nLaundry\nMakkah Hotel near Haram'}
                    />
                  </div>
                )}

                {step === 'stay' && (
                  <div className="space-y-4">
                    <div>
                      <Label>Stay Information Content</Label>
                      <p className="text-xs text-neutral-500 mt-1">
                        You can structure this section freely (headings, bullets, emphasis).
                      </p>
                      <div className="mt-2">
                        <RichTextEditor
                          value={stayInfoContentHtml}
                          onChange={setStayInfoContentHtml}
                          placeholder="Write stay information..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 'policies' && (
                  <div className="space-y-4">
                    <div>
                      <Label>Cancellation Policy</Label>
                      <Textarea
                        className="mt-1.5"
                        rows={4}
                        value={policyCancellation}
                        onChange={(e) => setPolicyCancellation(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Check-in Time</Label>
                        <Input
                          className="mt-1.5"
                          value={policyCheckIn}
                          onChange={(e) => setPolicyCheckIn(e.target.value)}
                          placeholder="2:00 PM"
                        />
                      </div>
                      <div>
                        <Label>Check-out Time</Label>
                        <Input
                          className="mt-1.5"
                          value={policyCheckOut}
                          onChange={(e) => setPolicyCheckOut(e.target.value)}
                          placeholder="11:00 AM"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Special Notes (one per line)</Label>
                      <Textarea
                        className="mt-1.5"
                        rows={8}
                        value={policyNotesText}
                        onChange={(e) => setPolicyNotesText(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {step === 'media' && (
                  <div className="space-y-4">
                    <ImageUpload
                      label="Package Image"
                      aspectRatio="wide"
                      currentImageUrl={currentImageUrl}
                      onFileSelected={(file) => setPendingImageFile(file)}
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Upload is deferred until publish. The image will be stored under the package
                      folder.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <ButtonSecondary type="button" onClick={goBack} disabled={isFirstStep || isSaving}>
                  Back
                </ButtonSecondary>
                {isLastStep ? (
                  <ButtonPrimary type="button" onClick={handlePublish} disabled={isSaving}>
                    {isSaving
                      ? 'Saving...'
                      : editPackageId
                        ? isDraftPackage
                          ? 'Publish Package'
                          : 'Save Changes'
                        : 'Publish Package'}
                  </ButtonPrimary>
                ) : (
                  <ButtonPrimary type="button" onClick={goNext} disabled={isSaving}>
                    Continue
                  </ButtonPrimary>
                )}
              </div>
            </>
          )}
        </div>
      )}
    />
  );
};

export default AddPackageWizardModal;
