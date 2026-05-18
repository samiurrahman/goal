'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import NcModal from '@/shared/NcModal';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonSecondary from '@/shared/ButtonSecondary';
import Label from '@/components/Label';
import Input from '@/shared/Input';
import Textarea from '@/shared/Textarea';
import Select from '@/shared/Select';
import DateSegmentInput from '@/components/DateSegmentInput';
import RichTextEditor from '@/shared/RichTextEditor';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/utils/supabaseClient';
import { uploadImageToStorage } from '@/utils/supabaseStorageHelper';
import { useCities } from '@/hooks/useCities';
import { allocatePackageSlug, slugify as slugifyShared } from '@/lib/slug';
import {
  PACKAGE_TAGS,
  packageTagTone,
  sanitizePackageTags,
  type PackageTag,
} from '@/constants/packageTags';
import {
  AMENITY_ICON_OPTIONS,
  DEFAULT_AMENITY_ICON,
  amenityIconClass,
} from '@/constants/amenityIcons';
import {
  ITERNARY_ICON_OPTIONS,
  type IternaryIconId,
} from '@/app/[agentName]/(components)/IternaryItem';
import {
  HOTEL_AMENITY_OPTIONS,
  sanitizeHotelAmenities,
  sanitizeHotelStars,
  type HotelAmenityKey,
} from '@/constants/hotelAmenities';

type WizardStep = 'meta' | 'itinerary' | 'amenities' | 'stay' | 'policies';

const WIZARD_STEPS: WizardStep[] = [
  'meta',
  'itinerary',
  'amenities',
  'stay',
  'policies',
];

const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  meta: 'Package Info',
  itinerary: 'Itinerary',
  amenities: 'Amenities',
  stay: 'Stay Information',
  policies: 'Cancellation Policy',
};

const POLICY_TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const normalizedHour = hour % 12 || 12;
  const meridiem = hour < 12 ? 'am' : 'pm';
  return `${normalizedHour}:00${meridiem}`;
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const linesToListHtml = (lines: string[]) => {
  const items = lines.map((line) => line.trim()).filter(Boolean);
  if (!items.length) return '';
  return `<ul>${items.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
};

const htmlToPlainText = (value: string) =>
  value
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();

const htmlToPlainLines = (value: string) =>
  htmlToPlainText(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const hasHtmlContent = (value: string) => htmlToPlainText(value).length > 0;

const STOP_OPTIONS = ['No stop', '1 stop', '2 stops'] as const;

// Fixed flight block — one at the start (departure) and one at the end (return)
// of every itinerary.
interface FlightItemInput {
  dayLabel: string;
  subtitle: string;
  departureCity: string;
  stops: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  flightInfo: string;
}

// Day block — added between the two flight blocks via the "Add day" button.
interface DayItemInput {
  dayLabel: string;
  subtitle: string;
  title: string;
  description: string;
  icon: IternaryIconId | '';
}

// An inclusion row — an icon picked from AMENITY_ICON_OPTIONS plus a free-text
// label and an optional sub-heading. Persisted to package_details.amenities
// as { name, icon, description } and rendered by AmenitiesSection on the
// package detail page.
interface AmenityItem {
  name: string;
  icon: string;
  description?: string;
}

const VALID_ICON_IDS = new Set(ITERNARY_ICON_OPTIONS.map((o) => o.id));

const normalizeIcon = (value: unknown): IternaryIconId | '' => {
  const id = String(value || '').trim();
  return VALID_ICON_IDS.has(id as IternaryIconId) ? (id as IternaryIconId) : '';
};

interface AddPackageWizardModalProps {
  agentAuthUserId: string;
  agentSlug: string;
  // Display label of the agent's saved city (e.g. "Mumbai"). Surfaced as
  // read-only inside the meta step so the agent sees where their package
  // will appear in the /packages location filter. Empty string falls back to
  // "Not set" — but the parent gates package creation on city_id being set,
  // so this should always be populated when the wizard opens.
  agentCity?: string;
  onCreated: () => void;
  editPackageId?: number;
  triggerLabel?: string;
  triggerContent?: React.ReactNode;
  triggerClassName?: string;
  // When true, the wizard does NOT render its own trigger button. The parent
  // controls opening by incrementing `openSignal`. Used by the listed-packages
  // page so it can intercept the click and show a profile-completion gate
  // when the agent's profile is incomplete.
  triggerless?: boolean;
  // Monotonic counter; each increment opens the wizard. Ignored unless
  // triggerless is true. Starts at 0 (does not auto-open on mount).
  openSignal?: number;
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

// Room sizes the wizard offers as toggleable tiers. 1 covers single
// occupancy (premium); 6 covers very budget group packages. Anything outside
// this range is rare enough that we'd rather force the agent to call us than
// guess at the UX. Saved packages with people-counts outside this range
// still round-trip correctly — they just won't get a toggle pill (the row
// for that tier renders if it's already in sharingRates, but can't be re-
// added once removed). Realistically this never matters because legacy data
// is all within [2, 5].
const SUPPORTED_SHARING_PEOPLE = [1, 2, 3, 4, 5, 6] as const;

const SHARING_PEOPLE_LABEL: Record<number, string> = {
  1: 'Single occupancy — private room',
  2: 'Twin / double room',
  3: 'Triple room',
  4: 'Quad room',
  5: 'Five-bed room',
  6: 'Six-bed room — most economical',
};

// Add or remove a tier while keeping two invariants:
//   1. Tiers stay sorted ascending so render order is stable regardless of
//      toggle order.
//   2. The CHEAPEST tier — by convention the one with the most people per
//      room — is always the default. "Default" is the price cards show as
//      the per-person rate, so it must always be the lowest. Letting the
//      first-toggled tier win silently surprised agents: they'd enter the
//      default-tier price, toggle 2-share (priced as default), then toggle
//      5-share expecting the cheaper tier to inherit the default — but
//      2-share stayed default and 5-share showed up empty.
// When the default changes we also reflow `pricePerPerson` into the new
// default tier *if it's empty*, so the most common workflow (enter price →
// add a cheaper tier) lands the price in the right row without overwriting
// anything the agent typed by hand.
const toggleSharingTier = (
  current: SharingRateItem[],
  people: number,
  pricePerPerson: string
): SharingRateItem[] => {
  const exists = current.some((r) => r.people === people);
  let next: SharingRateItem[];
  if (exists) {
    next = current.filter((r) => r.people !== people);
  } else {
    next = [
      ...current,
      { people, value: '', default: false },
    ].sort((a, b) => a.people - b.people);
  }
  if (next.length === 0) return next;
  // Cheapest = highest people count. Crown it the default and seed its
  // value from pricePerPerson when the tier doesn't already have one.
  const cheapest = next.reduce((a, b) => (a.people >= b.people ? a : b));
  return next.map((r) => {
    if (r.people !== cheapest.people) {
      return r.default ? { ...r, default: false } : r;
    }
    const seeded = !r.value && pricePerPerson ? pricePerPerson : r.value;
    return { ...r, default: true, value: seeded };
  });
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

type MetaErrors = Partial<Record<keyof PackageMetaForm, string>>;
type SharingRateErrors = Record<number, string>;

// All Package Info fields that must be filled before the user can move past
// step 1. Mirrors the checkout page's per-field validation pattern: each
// validator returns the error string for the field, or undefined when the
// value passes.
const META_REQUIRED_FIELDS: (keyof PackageMetaForm)[] = [
  'title',
  'short_description',
  'total_duration_days',
  'makkah_days',
  'madinah_days',
  'departure_city',
  'arrival_city',
  'departure_date',
  'arrival_date',
  'makkah_hotel_name',
  'makkah_hotel_distance_m',
  'madinah_hotel_name',
  'madinah_hotel_distance_m',
];

const validateMetaField = (
  name: keyof PackageMetaForm,
  raw: string,
  all: PackageMetaForm
): string | undefined => {
  const value = String(raw || '').trim();
  switch (name) {
    case 'title':
      return value ? undefined : 'Title is required';
    case 'short_description':
      return value ? undefined : 'Short description is required';
    case 'total_duration_days':
    case 'makkah_days':
    case 'madinah_days': {
      if (!value) return 'Required';
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return 'Enter a positive number of days';
      return undefined;
    }
    case 'departure_city':
      return value ? undefined : 'Departure city is required';
    case 'arrival_city':
      return value ? undefined : 'Arrival city is required';
    case 'departure_date': {
      if (!value) return 'Departure date is required';
      const d = new Date(`${value}T00:00:00`);
      if (Number.isNaN(d.getTime())) return 'Enter a valid date';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return 'Date cannot be in the past';
      return undefined;
    }
    case 'arrival_date': {
      if (!value) return 'Arrival date is required';
      const d = new Date(`${value}T00:00:00`);
      if (Number.isNaN(d.getTime())) return 'Enter a valid date';
      const dep = all.departure_date ? new Date(`${all.departure_date}T00:00:00`) : null;
      if (dep && !Number.isNaN(dep.getTime()) && d < dep) {
        return 'Must be on or after departure date';
      }
      return undefined;
    }
    case 'makkah_hotel_name':
      return value ? undefined : 'Makkah hotel name is required';
    case 'madinah_hotel_name':
      return value ? undefined : 'Madinah hotel name is required';
    case 'makkah_hotel_distance_m':
    case 'madinah_hotel_distance_m': {
      if (!value) return 'Walking distance is required';
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) return 'Enter a non-negative number';
      return undefined;
    }
    default:
      return undefined;
  }
};

const validateSharingRate = (value: string): string | undefined => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'Price is required';
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return 'Enter a positive price';
  return undefined;
};

const errorBorderClass = (err?: string): string =>
  err ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : '';

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
  makkah_hotel_name: '',
  makkah_hotel_distance_m: '',
  madinah_hotel_name: '',
  madinah_hotel_distance_m: '',
};

const makeEmptyFlight = (): FlightItemInput => ({
  dayLabel: '',
  subtitle: '',
  departureCity: '',
  stops: 'No stop',
  arrivalCity: '',
  departureTime: '',
  arrivalTime: '',
  flightInfo: '',
});

const makeEmptyDay = (): DayItemInput => ({
  dayLabel: '',
  subtitle: '',
  title: '',
  description: '',
  icon: '',
});

const flightHasContent = (flight: FlightItemInput): boolean =>
  [
    flight.dayLabel,
    flight.subtitle,
    flight.departureCity,
    flight.arrivalCity,
    flight.departureTime,
    flight.arrivalTime,
    flight.flightInfo,
  ].some((value) => String(value || '').trim());

const dayHasContent = (day: DayItemInput): boolean =>
  [day.dayLabel, day.subtitle, day.title, day.icon].some((value) =>
    String(value || '').trim()
  ) || hasHtmlContent(day.description);

const formatYmdDisplay = (ymd: string): string => {
  if (!ymd) return '';
  const date = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

// Auto-compose a short description from the structured fields the agent has
// already filled in. Used to prefill the Short Description textarea so agents
// don't have to write SEO copy by hand. The agent can still overwrite it —
// the effect that calls this respects manual edits.
const composeShortDescription = (
  meta: PackageMetaForm,
  defaultRate: SharingRateItem | undefined
): string => {
  const days = Number(meta.total_duration_days);
  const hasDays = Number.isFinite(days) && days > 0;
  const depDate = formatYmdDisplay(meta.departure_date);
  const arrDate = formatYmdDisplay(meta.arrival_date);
  const hasRoute = Boolean(meta.departure_city || meta.arrival_city);
  const hasDates = Boolean(depDate || arrDate);

  // Nothing concrete to say yet — leave the textarea empty so the placeholder
  // shows. We only emit the generic "Umrah package" prefix once it can be
  // anchored to at least one fact (duration, route, or dates).
  if (!hasDays && !hasRoute && !hasDates) return '';

  const facts: string[] = [];
  facts.push(hasDays ? `${days}-day Umrah package` : 'Umrah package');
  if (meta.departure_city && meta.arrival_city) {
    facts.push(`from ${meta.departure_city} to ${meta.arrival_city}`);
  } else if (meta.departure_city) {
    facts.push(`from ${meta.departure_city}`);
  }
  let dateLabel = '';
  if (depDate && arrDate) dateLabel = `${depDate} – ${arrDate}`;
  else if (depDate) dateLabel = `departing ${depDate}`;
  const head = facts.join(' ') + (dateLabel ? `, ${dateLabel}` : '');

  const priceValue = Number(defaultRate?.value || meta.price_per_person || 0);
  const sharingPeople = defaultRate?.people;
  if (Number.isFinite(priceValue) && priceValue > 0) {
    const formattedPrice = `${meta.currency || 'INR'} ${priceValue.toLocaleString('en-IN')}`;
    const tier = sharingPeople ? ` (${sharingPeople}-sharing)` : '';
    return `${head}. ${formattedPrice} per person${tier}.`;
  }
  return `${head}.`;
};

const HotelTagsField: React.FC<{
  label: string;
  stars: number | null;
  onStarsChange: (value: number | null) => void;
  amenities: HotelAmenityKey[];
  onAmenitiesChange: (value: HotelAmenityKey[]) => void;
}> = ({ label, stars, onStarsChange, amenities, onAmenitiesChange }) => {
  const toggleAmenity = (key: HotelAmenityKey) => {
    onAmenitiesChange(
      amenities.includes(key) ? amenities.filter((k) => k !== key) : [...amenities, key]
    );
  };

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3 space-y-3">
      <Label>{label}</Label>
      <div>
        <div className="text-xs text-neutral-500 mb-1.5">Star rating</div>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = stars === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onStarsChange(active ? null : n)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                }`}
                aria-pressed={active}
              >
                <span className="text-amber-400 leading-none">★</span>
                {n}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-xs text-neutral-500 mb-1.5">Amenities</div>
        <div className="flex flex-wrap gap-1.5">
          {HOTEL_AMENITY_OPTIONS.map((opt) => {
            const active = amenities.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleAmenity(opt.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
                }`}
                aria-pressed={active}
              >
                <i className={`las ${opt.icon} text-[14px] leading-none`} aria-hidden />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AddPackageWizardModal = ({
  agentAuthUserId,
  agentSlug,
  agentCity,
  onCreated,
  editPackageId,
  triggerLabel,
  triggerContent,
  triggerClassName,
  triggerless = false,
  openSignal = 0,
}: AddPackageWizardModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [isDraftPackage, setIsDraftPackage] = useState(false);
  const [step, setStep] = useState<WizardStep>('meta');

  const [meta, setMeta] = useState<PackageMetaForm>(initialMetaForm);
  // Tracks which of makkah_days / madinah_days currently holds an auto-derived
  // value (total − the other field). Needed because the inference fires per
  // keystroke: typing "11" arrives as "1" then "11", and without this flag the
  // first keystroke fills the opposite field and locks it in. Cleared whenever
  // the user types into the field directly, so a manual override sticks.
  const daysAutofilledRef = useRef<{ makkah: boolean; madinah: boolean }>({
    makkah: false,
    madinah: false,
  });
  // Sharing tiers offered by this package. Agents are NOT forced to offer
  // every size — some sell only quads, some only twin+quad, etc. The wizard
  // surfaces a toggle row of all SUPPORTED_SHARING_PEOPLE values; this
  // state holds only the ones the agent has switched on. Editing a saved
  // package replaces this with whatever tiers were previously stored
  // (prefillForEdit). Default initial state mirrors the most common case:
  // quad-share marked as the default (cheapest tier shown on cards).
  const [sharingRates, setSharingRates] = useState<SharingRateItem[]>([
    { people: 4, value: '', default: true },
  ]);
  const [startFlight, setStartFlight] = useState<FlightItemInput>(makeEmptyFlight());
  const [dayItems, setDayItems] = useState<DayItemInput[]>([makeEmptyDay()]);
  const [endFlight, setEndFlight] = useState<FlightItemInput>(makeEmptyFlight());
  const [amenities, setAmenities] = useState<AmenityItem[]>([]);
  const [amenityDraftIcon, setAmenityDraftIcon] = useState<string>(DEFAULT_AMENITY_ICON);
  const [amenityDraftLabel, setAmenityDraftLabel] = useState('');
  const [amenityDraftDescription, setAmenityDraftDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<PackageTag[]>([]);
  const [stayInfoContentHtml, setStayInfoContentHtml] = useState('');
  const [stayInfoLede, setStayInfoLede] = useState('');
  const [makkahHotelStars, setMakkahHotelStars] = useState<number | null>(null);
  const [makkahHotelAmenities, setMakkahHotelAmenities] = useState<HotelAmenityKey[]>([]);
  const [madinahHotelStars, setMadinahHotelStars] = useState<number | null>(null);
  const [madinahHotelAmenities, setMadinahHotelAmenities] = useState<HotelAmenityKey[]>([]);
  const [policyCancellation, setPolicyCancellation] = useState('');
  const [policyCheckIn, setPolicyCheckIn] = useState('');
  const [policyCheckOut, setPolicyCheckOut] = useState('');
  const [policyNotesText, setPolicyNotesText] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  // Per-field validation errors for the meta (Package Info) step. Set on
  // blur and on Next-click; cleared as the underlying value becomes valid
  // via the useEffect below. Mirrors the checkout page's pattern.
  const [metaErrors, setMetaErrors] = useState<MetaErrors>({});
  // Sharing-rate errors keyed by people-per-room. Each enabled tier must
  // have a positive price before the user can leave the meta step.
  const [sharingRateErrors, setSharingRateErrors] = useState<SharingRateErrors>({});
  const { data: citiesData, isLoading: citiesLoading } = useCities();

  // True once the agent has typed their own copy into the short-description
  // textarea. While true, auto-fill backs off so we don't overwrite their
  // work. Reset to false when they clear the textarea (resuming auto-fill)
  // or when the form is reset for a new package. On edit prefill we mirror
  // whether the saved description has any content.
  const shortDescTouchedRef = useRef<boolean>(false);

  // Auto-fill the short description from structured fields. Runs whenever a
  // dependent field changes. Skipped entirely while the agent has manual
  // copy — gated by shortDescTouchedRef rather than string-diffing the last
  // generated value, which was fragile across modal reopens and edits.
  useEffect(() => {
    if (shortDescTouchedRef.current) return;
    const defaultRate = sharingRates.find((r) => r.default) ?? sharingRates[0];
    const generated = composeShortDescription(meta, defaultRate);
    setMeta((prev) => {
      if (generated === prev.short_description) return prev;
      return { ...prev, short_description: generated };
    });
    // composeShortDescription pulls many fields off `meta`, but only the
    // listed primitives drive the output — depending on the whole object
    // would loop because this effect also calls setMeta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    meta.total_duration_days,
    meta.departure_city,
    meta.arrival_city,
    meta.departure_date,
    meta.arrival_date,
    meta.currency,
    meta.price_per_person,
    sharingRates,
  ]);

  // Triggerless mode: the parent controls open via an incrementing counter.
  // Skip the very first render's value (0 or the initial mount value) so the
  // wizard only opens on subsequent increments, not when the component mounts.
  useEffect(() => {
    if (!triggerless) return;
    if (openSignal <= 0) return;
    const open = async () => {
      resetForm();
      if (editPackageId) {
        await prefillForEdit();
      }
      setIsOpen(true);
    };
    void open();
    // resetForm / prefillForEdit are stable closures over component state;
    // re-running on each openSignal increment is the desired behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal, triggerless]);

  const currentStepIndex = WIZARD_STEPS.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const stepTitle = useMemo(() => {
    return WIZARD_STEP_LABELS[step];
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

  // On edit: round-trip new-format itinerary data back into the wizard. Legacy
  // packages (saved before the flight-block redesign) carry no `kind` and can't
  // be cleanly mapped, so they open with a fresh start flight + one day + return
  // flight — the agent rebuilds the itinerary and the old data is replaced on
  // the next save.
  const parseIternaryForEdit = (
    value: unknown
  ): { startFlight: FlightItemInput; dayItems: DayItemInput[]; endFlight: FlightItemInput } => {
    const fresh = {
      startFlight: makeEmptyFlight(),
      dayItems: [makeEmptyDay()],
      endFlight: makeEmptyFlight(),
    };

    let source: unknown = value;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch {
        return fresh;
      }
    }
    if (!Array.isArray(source)) return fresh;

    const rows = source as Record<string, unknown>[];
    const hasNewFormat = rows.some((row) => row && typeof row === 'object' && 'kind' in row);
    if (!hasNewFormat) return fresh;

    const toFlight = (row: Record<string, unknown> | undefined): FlightItemInput => {
      const stops = String(row?.stops || '').trim();
      return {
        dayLabel: String(row?.dayLabel || ''),
        subtitle: String(row?.subtitle || ''),
        departureCity: String(row?.departureCity || ''),
        stops: (STOP_OPTIONS as readonly string[]).includes(stops) ? stops : 'No stop',
        arrivalCity: String(row?.arrivalCity || ''),
        departureTime: String(row?.departureTime || ''),
        arrivalTime: String(row?.arrivalTime || ''),
        flightInfo: String(row?.flightInfo || ''),
      };
    };

    const toDay = (row: Record<string, unknown>): DayItemInput => ({
      dayLabel: String(row?.dayLabel || ''),
      subtitle: String(row?.subtitle || ''),
      title: String(row?.title || ''),
      description: String(row?.description || ''),
      icon: normalizeIcon(row?.icon),
    });

    const flights = rows.filter((row) => String(row?.kind) === 'flight');
    const days = rows.filter((row) => String(row?.kind) === 'day');

    return {
      startFlight: toFlight(flights[0]),
      dayItems: days.length > 0 ? days.map(toDay) : [makeEmptyDay()],
      endFlight: toFlight(flights.length > 1 ? flights[flights.length - 1] : undefined),
    };
  };

  const parseAmenities = (value: unknown): AmenityItem[] => {
    let source: unknown = value;
    if (typeof source === 'string') {
      try {
        source = JSON.parse(source);
      } catch {
        source = [];
      }
    }

    if (!Array.isArray(source)) return [];

    return source
      .map((item): AmenityItem | null => {
        // Legacy rows were plain strings with no icon.
        if (typeof item === 'string') {
          const name = item.trim();
          return name ? { name, icon: '' } : null;
        }
        if (item && typeof item === 'object') {
          const row = item as Record<string, unknown>;
          const name = String(row.name || row.title || row.label || '').trim();
          if (!name) return null;
          const description = String(row.description || row.subtitle || row.subheading || '').trim();
          return {
            name,
            icon: String(row.icon || ''),
            description: description || undefined,
          };
        }
        return null;
      })
      .filter((item): item is AmenityItem => Boolean(item));
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

    daysAutofilledRef.current = { makkah: false, madinah: false };
    shortDescTouchedRef.current = Boolean(String(packageRow.short_description || '').trim());
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
      makkah_hotel_name: String(packageRow.makkah_hotel_name || ''),
      makkah_hotel_distance_m: String(packageRow.makkah_hotel_distance_m ?? ''),
      madinah_hotel_name: String(packageRow.madinah_hotel_name || ''),
      madinah_hotel_distance_m: String(packageRow.madinah_hotel_distance_m ?? ''),
    });
    setSharingRates(parsedRates);
    const parsedIternary = parseIternaryForEdit(detailsRow?.iternary);
    setStartFlight(parsedIternary.startFlight);
    setDayItems(parsedIternary.dayItems);
    setEndFlight(parsedIternary.endFlight);
    setAmenities(parseAmenities(detailsRow?.amenities));
    setAmenityDraftIcon(DEFAULT_AMENITY_ICON);
    setAmenityDraftLabel('');
    setSelectedTags(sanitizePackageTags(packageRow.tags));
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
    setStayInfoLede(String(stayInfoRow.lede || stayInfoRow.subheading || ''));
    const hotelsRow = (stayInfoRow.hotels || {}) as {
      makkah?: { stars?: unknown; amenities?: unknown };
      madinah?: { stars?: unknown; amenities?: unknown };
    };
    setMakkahHotelStars(sanitizeHotelStars(hotelsRow.makkah?.stars));
    setMakkahHotelAmenities(sanitizeHotelAmenities(hotelsRow.makkah?.amenities));
    setMadinahHotelStars(sanitizeHotelStars(hotelsRow.madinah?.stars));
    setMadinahHotelAmenities(sanitizeHotelAmenities(hotelsRow.madinah?.amenities));

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
        ? linesToListHtml(
            (policiesRow.notes as unknown[]).map((line: unknown) => String(line || ''))
          )
        : Array.isArray(policiesRow.special_notes)
          ? linesToListHtml(
              (policiesRow.special_notes as unknown[]).map((line: unknown) => String(line || ''))
            )
          : ''
    );
    setCurrentImageUrl(packageRow.thumbnail_url || undefined);
    setPendingImageFile(null);
    setIsDraftPackage(packageRow.published === false);
    setIsLoadingPackage(false);
  };

  const resetForm = () => {
    daysAutofilledRef.current = { makkah: false, madinah: false };
    shortDescTouchedRef.current = false;
    setMeta(initialMetaForm);
    setSharingRates([{ people: 4, value: '', default: true }]);
    setStartFlight(makeEmptyFlight());
    setDayItems([makeEmptyDay()]);
    setEndFlight(makeEmptyFlight());
    setAmenities([]);
    setAmenityDraftIcon(DEFAULT_AMENITY_ICON);
    setAmenityDraftLabel('');
    setSelectedTags([]);
    setStayInfoContentHtml('');
    setStayInfoLede('');
    setMakkahHotelStars(null);
    setMakkahHotelAmenities([]);
    setMadinahHotelStars(null);
    setMadinahHotelAmenities([]);
    setAmenityDraftDescription('');
    setPolicyCancellation('');
    setPolicyCheckIn('');
    setPolicyCheckOut('');
    setPolicyNotesText('');
    setPendingImageFile(null);
    setIsDraftPackage(false);
    setMetaErrors({});
    setSharingRateErrors({});
    setStep('meta');
  };

  // Keep existing field errors in sync with the current value: clear the
  // error when the value becomes valid, and refresh the message when the
  // reason changes (e.g. "Departure date is required" → "Date cannot be in
  // the past" once the user fills a past date). We never *add* errors for
  // untouched fields here — only existing ones are reconciled.
  useEffect(() => {
    setMetaErrors((prev) => {
      let changed = false;
      const next: MetaErrors = { ...prev };
      (Object.keys(prev) as (keyof PackageMetaForm)[]).forEach((field) => {
        const err = validateMetaField(field, meta[field], meta);
        if (!err) {
          delete next[field];
          changed = true;
        } else if (err !== prev[field]) {
          next[field] = err;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [meta]);

  useEffect(() => {
    setSharingRateErrors((prev) => {
      let changed = false;
      const next: SharingRateErrors = { ...prev };
      Object.keys(prev).forEach((peopleStr) => {
        const people = Number(peopleStr);
        const rate = sharingRates.find((r) => r.people === people);
        if (!rate) {
          delete next[people];
          changed = true;
          return;
        }
        const err = validateSharingRate(rate.value);
        if (!err) {
          delete next[people];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [sharingRates]);

  const validateMetaStep = (): boolean => {
    const errors: MetaErrors = {};
    META_REQUIRED_FIELDS.forEach((field) => {
      const err = validateMetaField(field, meta[field], meta);
      if (err) errors[field] = err;
    });
    setMetaErrors(errors);

    const rateErrors: SharingRateErrors = {};
    sharingRates.forEach((rate) => {
      const err = validateSharingRate(rate.value);
      if (err) rateErrors[rate.people] = err;
    });
    setSharingRateErrors(rateErrors);

    return Object.keys(errors).length === 0 && Object.keys(rateErrors).length === 0;
  };

  const validateCurrentStep = (): boolean => {
    if (step === 'meta') {
      if (!validateMetaStep()) {
        toast.error('Please complete all required fields in Package Info.');
        return false;
      }
      if (!pendingImageFile && !currentImageUrl) {
        toast.error('Please upload a package image.');
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (isLastStep) return;
    if (!validateCurrentStep()) return;
    setStep(WIZARD_STEPS[currentStepIndex + 1]);
  };

  const tryGoToStep = (target: WizardStep) => {
    const targetIndex = WIZARD_STEPS.indexOf(target);
    if (targetIndex === currentStepIndex) return;
    // Backward navigation is always allowed.
    if (targetIndex < currentStepIndex) {
      setStep(target);
      return;
    }
    // Forward jumps must pass the same validation as the Next button.
    if (!validateCurrentStep()) return;
    setStep(target);
  };

  const goBack = () => {
    if (isFirstStep) return;
    setStep(WIZARD_STEPS[currentStepIndex - 1]);
  };

  const addAmenity = () => {
    const name = amenityDraftLabel.trim();
    if (!name) return;
    const description = amenityDraftDescription.trim();
    setAmenities((prev) => [
      ...prev,
      { name, icon: amenityDraftIcon, description: description || undefined },
    ]);
    setAmenityDraftLabel('');
    setAmenityDraftDescription('');
    // Keep the icon selected — agents often add several rows of the same kind.
  };

  const removeAmenity = (index: number) => {
    setAmenities((prev) => prev.filter((_, i) => i !== index));
  };

  const completedSteps = useMemo<Record<WizardStep, boolean>>(
    () => ({
      meta:
        [
          meta.title,
          meta.short_description,
          meta.total_duration_days,
          meta.makkah_days,
          meta.madinah_days,
          meta.departure_city,
          meta.arrival_city,
          meta.departure_date,
          meta.arrival_date,
          meta.makkah_hotel_name,
          meta.makkah_hotel_distance_m,
          meta.madinah_hotel_name,
          meta.madinah_hotel_distance_m,
        ].some((value) => String(value || '').trim()) ||
        sharingRates.some((rate) => String(rate.value || '').trim()) ||
        Boolean(pendingImageFile || currentImageUrl) ||
        selectedTags.length > 0,
      itinerary:
        flightHasContent(startFlight) ||
        flightHasContent(endFlight) ||
        dayItems.some(dayHasContent),
      amenities: amenities.length > 0,
      stay: hasHtmlContent(stayInfoContentHtml),
      policies:
        Boolean(policyCancellation.trim()) ||
        Boolean(policyCheckIn.trim()) ||
        Boolean(policyCheckOut.trim()) ||
        hasHtmlContent(policyNotesText),
    }),
    [
      amenities,
      selectedTags,
      currentImageUrl,
      dayItems,
      endFlight,
      startFlight,
      meta,
      pendingImageFile,
      policyCancellation,
      policyCheckIn,
      policyCheckOut,
      policyNotesText,
      sharingRates,
      stayInfoContentHtml,
    ]
  );

  // Day-count helpers used by the auto-inference rules below. Trip length is
  // (arrival - departure) calendar days; we don't add a +1 because the
  // convention in this codebase (and the on-card display) treats Total Days
  // as nights/days-in-country, not "inclusive day count".
  const daysBetween = (fromYmd: string, toYmd: string): number | null => {
    if (!fromYmd || !toYmd) return null;
    const from = new Date(`${fromYmd}T00:00:00Z`);
    const to = new Date(`${toYmd}T00:00:00Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
    const diff = Math.round((to.getTime() - from.getTime()) / 86400000);
    return diff > 0 ? diff : null;
  };

  const addDaysToYmd = (fromYmd: string, days: number): string | null => {
    if (!fromYmd || !Number.isFinite(days) || days <= 0) return null;
    const from = new Date(`${fromYmd}T00:00:00Z`);
    if (Number.isNaN(from.getTime())) return null;
    from.setUTCDate(from.getUTCDate() + days);
    return from.toISOString().slice(0, 10);
  };

  const handleMetaBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const name = e.target.name as keyof PackageMetaForm;
    if (!META_REQUIRED_FIELDS.includes(name)) return;
    const err = validateMetaField(name, e.target.value, meta);
    setMetaErrors((prev) => {
      if (!err) {
        if (!(name in prev)) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: err };
    });
  };

  const handleMetaChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'slug') {
      // Slug is auto-generated from title in background.
      return;
    }

    // Any direct edit to makkah/madinah clears that field's auto-filled flag
    // so future inference won't overwrite the user's typed value.
    if (name === 'makkah_days') daysAutofilledRef.current.makkah = false;
    if (name === 'madinah_days') daysAutofilledRef.current.madinah = false;
    // Typing in the short-description textarea marks it as user-owned; an
    // empty value (clear) hands control back to the auto-fill effect.
    if (name === 'short_description') {
      shortDescTouchedRef.current = value.trim().length > 0;
    }

    setMeta((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'title') {
        next.slug = slugify(value);
      }
      // Date ↔ Total Days bidirectional inference. The two date fields and
      // the total-days field describe the same trip — knowing any two pins
      // the third. We compute the third only when it's empty so the agent
      // can override (e.g. they want to advertise a "10-day package" even
      // if their flight dates span 11 nights).
      if (name === 'departure_date' || name === 'arrival_date') {
        const dep = name === 'departure_date' ? value : next.departure_date;
        const arr = name === 'arrival_date' ? value : next.arrival_date;
        const computed = daysBetween(dep, arr);
        if (computed && !next.total_duration_days.trim()) {
          next.total_duration_days = String(computed);
        }
        // If both dates are now set and total days is filled, leave it —
        // the agent already committed to a number. Conflict warning is
        // handled inline by the helper text below the field.
      }
      if (name === 'total_duration_days' && next.departure_date && !next.arrival_date.trim()) {
        const days = Number(value);
        const computed = addDaysToYmd(next.departure_date, days);
        if (computed) next.arrival_date = computed;
      }

      // Makkah / Madinah / Total balance. If two are known the third is
      // determined. Same "only fill if empty" guard so the agent can split
      // hours (or fudge the math for marketing) without us overwriting.
      if (name === 'makkah_days' || name === 'madinah_days' || name === 'total_duration_days') {
        const total = Number(next.total_duration_days);
        const mak = Number(next.makkah_days);
        const mad = Number(next.madinah_days);
        const isPos = (n: number) => Number.isFinite(n) && n > 0;
        // An auto-filled side is treated as "free to overwrite" so that typing
        // additional digits into the other side recomputes it correctly
        // (e.g. typing "11" arrives as "1" then "11" — without this the first
        // keystroke locks the derived value).
        const madOverwritable = !next.madinah_days.trim() || daysAutofilledRef.current.madinah;
        const makOverwritable = !next.makkah_days.trim() || daysAutofilledRef.current.makkah;
        if (name === 'makkah_days' && isPos(total) && isPos(mak) && madOverwritable) {
          const derived = total - mak;
          if (derived > 0) {
            next.madinah_days = String(derived);
            daysAutofilledRef.current.madinah = true;
          }
        } else if (name === 'madinah_days' && isPos(total) && isPos(mad) && makOverwritable) {
          const derived = total - mad;
          if (derived > 0) {
            next.makkah_days = String(derived);
            daysAutofilledRef.current.makkah = true;
          }
        } else if (name === 'total_duration_days' && isPos(total)) {
          // Newly-set total days: if exactly one of Makkah/Madinah is set,
          // auto-fill the other. If both are set, leave them.
          if (isPos(mak) && madOverwritable) {
            const derived = total - mak;
            if (derived > 0) {
              next.madinah_days = String(derived);
              daysAutofilledRef.current.madinah = true;
            }
          } else if (isPos(mad) && makOverwritable) {
            const derived = total - mad;
            if (derived > 0) {
              next.makkah_days = String(derived);
              daysAutofilledRef.current.makkah = true;
            }
          }
        }
      }

      return next;
    });
  };

  const handlePublish = async (forcePublish: boolean = true) => {
    if (!meta.title.trim()) {
      toast.error('Title is required.');
      setStep('meta');
      return;
    }

    if (!slugifyShared(meta.title)) {
      toast.error('Slug is invalid.');
      setStep('meta');
      return;
    }

    // Filter-critical fields. /packages applies range/date filters against
    // these; if they're missing the package effectively becomes invisible to
    // most user searches. Drafts (forcePublish=false) are exempt so agents
    // can save work-in-progress freely. Publishing requires all of them.
    if (forcePublish) {
      // Price comes from the default sharing tier (the cheapest one). No
      // separate price input — agents enter the amount once, in the tier row.
      const defaultRateValue = Number(
        (sharingRates.find((r) => r.default) ?? sharingRates[0])?.value || 0
      );
      if (!Number.isFinite(defaultRateValue) || defaultRateValue <= 0) {
        toast.error('Enter a price for the default sharing tier to publish.');
        setStep('meta');
        return;
      }

      if (!meta.departure_date) {
        toast.error('Departure date is required to publish.');
        setStep('meta');
        return;
      }
      const departureDate = new Date(meta.departure_date);
      if (Number.isNaN(departureDate.getTime())) {
        toast.error('Departure date is invalid.');
        setStep('meta');
        return;
      }
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      if (departureDate < todayMidnight) {
        toast.error('Departure date cannot be in the past.');
        setStep('meta');
        return;
      }

      if (!meta.arrival_date) {
        toast.error('Arrival date is required to publish.');
        setStep('meta');
        return;
      }
      const arrivalDate = new Date(meta.arrival_date);
      if (Number.isNaN(arrivalDate.getTime())) {
        toast.error('Arrival date is invalid.');
        setStep('meta');
        return;
      }
      if (arrivalDate < departureDate) {
        toast.error('Arrival date must be on or after departure date.');
        setStep('meta');
        return;
      }

      const duration = Number(meta.total_duration_days);
      if (!Number.isFinite(duration) || duration <= 0) {
        toast.error('Total duration (days) is required to publish.');
        setStep('meta');
        return;
      }

      const makkahDistance = Number(meta.makkah_hotel_distance_m);
      if (!Number.isFinite(makkahDistance) || makkahDistance < 0) {
        toast.error('Makkah hotel distance is required to publish.');
        setStep('meta');
        return;
      }

      const madinahDistance = Number(meta.madinah_hotel_distance_m);
      if (!Number.isFinite(madinahDistance) || madinahDistance < 0) {
        toast.error('Madinah hotel distance is required to publish.');
        setStep('meta');
        return;
      }

      if (!pendingImageFile && !currentImageUrl) {
        toast.error('Please upload a package image to publish.');
        setStep('meta');
        return;
      }
    }

    setIsSaving(true);

    // Allocate a unique slug scoped to this agent.
    // - For published edits: keep the existing slug so shared URLs don't break.
    // - For drafts (e.g. cloned packages still unpublished): re-allocate from
    //   the user's current title/slug so we don't keep a temp timestamped slug.
    // - For new packages: allocate fresh from the user's input.
    const userSlugInput = (meta.slug || '').trim();
    const slugSource = userSlugInput || meta.title;
    let packageSlug: string;
    try {
      if (editPackageId) {
        const { data: existing } = await supabase
          .from('packages')
          .select('slug, published')
          .eq('id', editPackageId)
          .maybeSingle();

        const existingSlug = (existing?.slug && String(existing.slug).trim()) || '';
        const existingIsPublished = existing?.published !== false;

        if (existingIsPublished) {
          packageSlug =
            existingSlug || (await allocatePackageSlug(agentAuthUserId, slugSource, editPackageId));
        } else {
          packageSlug = await allocatePackageSlug(agentAuthUserId, slugSource, editPackageId);
        }
      } else {
        packageSlug = await allocatePackageSlug(agentAuthUserId, slugSource);
      }
    } catch (slugErr) {
      const message = slugErr instanceof Error ? slugErr.message : 'Failed to allocate slug';
      toast.error(message);
      setIsSaving(false);
      return;
    }

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
      tags: selectedTags,
      // Save & Publish forces published=true. Plain Save preserves the current
      // published state on edits; new packages start as drafts.
      published: forcePublish ? true : editPackageId ? !isDraftPackage : false,
      thumbnail_url: editPackageId ? currentImageUrl || null : null,
    };

    const runSave = async (payload: Record<string, unknown>) => {
      return editPackageId
        ? await supabase
            .from('packages')
            .update(payload)
            .eq('id', editPackageId)
            .select()
            .single()
        : await supabase.from('packages').insert([payload]).select().single();
    };

    let { data: packageData, error: packageError } = await runSave(packagePayload);

    // The `tags` column was added in a later migration. If the host hasn't
    // applied it yet (Supabase responds with PGRST204 / "column not found"),
    // strip `tags` and retry so the save still succeeds. Agents will need to
    // run the migration to actually persist chip selections.
    const errMsg = packageError?.message || '';
    const isMissingTagsColumn =
      packageError?.code === 'PGRST204' ||
      (/tags/i.test(errMsg) && /(column|find|not found|does not exist)/i.test(errMsg));

    if (packageError && isMissingTagsColumn && 'tags' in packagePayload) {
      const { tags: _tags, ...payloadWithoutTags } = packagePayload as { tags?: unknown } & Record<
        string,
        unknown
      >;
      console.warn(
        'packages.tags column missing — retrying save without tags. Apply migration 20260511010000_add_tags_to_packages.sql to persist chip selections.'
      );
      const retry = await runSave(payloadWithoutTags);
      packageData = retry.data;
      packageError = retry.error;
    }

    if (packageError || !packageData) {
      setIsSaving(false);
      toast.error('Failed to create package: ' + (packageError?.message || 'Unknown error'));
      return;
    }

    let finalThumbnailUrl: string | null = null;
    let finalThumbnailBlur: string | null = null;
    if (pendingImageFile) {
      const imageUpload = await uploadImageToStorage(
        pendingImageFile,
        `agents/${agentAuthUserId}/packages/${packageData.id}`,
        undefined,
        { fixedFileName: 'image', generateLqip: true }
      );
      if (imageUpload.error) {
        toast.error('Image upload failed: ' + imageUpload.error);
      } else {
        // Append a cache-buster so Next.js Image (minimumCacheTTL: 30 days)
        // and CDN/browser caches don't keep serving the previous thumbnail
        // at this same Supabase storage path after an overwrite.
        finalThumbnailUrl = imageUpload.url
          ? `${imageUpload.url}${imageUpload.url.includes('?') ? '&' : '?'}v=${Date.now()}`
          : null;
        finalThumbnailBlur = imageUpload.lqip ?? null;
      }
    }

    if (finalThumbnailUrl) {
      await supabase
        .from('packages')
        .update({
          thumbnail_url: finalThumbnailUrl,
          thumbnail_blur: finalThumbnailBlur,
        })
        .eq('id', packageData.id);
      setCurrentImageUrl(finalThumbnailUrl);
    }

    const packageDetailsPayload = {
      package_id: packageData.id,
      iternary: [
        ...(flightHasContent(startFlight)
          ? [{ kind: 'flight' as const, position: 'start' as const, ...startFlight }]
          : []),
        ...dayItems.filter(dayHasContent).map((day) => ({ kind: 'day' as const, ...day })),
        ...(flightHasContent(endFlight)
          ? [{ kind: 'flight' as const, position: 'end' as const, ...endFlight }]
          : []),
      ],
      stay_information: {
        title: 'Stay information',
        details: [],
        content_html: stayInfoContentHtml.trim(),
        lede: stayInfoLede.trim(),
        hotels: {
          makkah: {
            stars: makkahHotelStars,
            amenities: makkahHotelAmenities,
          },
          madinah: {
            stars: madinahHotelStars,
            amenities: madinahHotelAmenities,
          },
        },
      },
      purchase_summary: {
        rates: selectedRates,
        currency: 'INR',
        min_guests: 1,
        max_guests: 20,
      },
      amenities: amenities
        .map((item) => ({
          name: item.name.trim(),
          icon: item.icon || '',
          description: (item.description || '').trim() || undefined,
        }))
        .filter((item) => item.name),
      policies: {
        cancellation: policyCancellation.trim(),
        checkIn: policyCheckIn.trim(),
        checkOut: policyCheckOut.trim(),
        notes: htmlToPlainLines(policyNotesText),
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
        ? forcePublish && isDraftPackage
          ? 'Package published successfully!'
          : 'Package updated successfully!'
        : forcePublish
          ? 'Package created and published!'
          : 'Package saved as draft.'
    );
    onCreated();
    closeModal();
    resetForm();
  };

  // The two flight blocks share an identical field set, so they render through
  // one helper. They are fixed — always present, never reorderable or removable.
  const renderFlightBlock = (
    label: string,
    flight: FlightItemInput,
    setFlight: React.Dispatch<React.SetStateAction<FlightItemInput>>
  ) => {
    const update = <K extends keyof FlightItemInput>(key: K, value: FlightItemInput[K]) => {
      setFlight((prev) => ({ ...prev, [key]: value }));
    };

    return (
      <div className="rounded-2xl border border-primary-200 dark:border-primary-900/50 bg-primary-50/40 dark:bg-primary-900/10 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            <i className="las la-plane text-base" />
          </span>
          <h4 className="font-medium">{label}</h4>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">· fixed block</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <Label>Day label</Label>
            <Input
              className="mt-1.5"
              placeholder="Day 1"
              value={flight.dayLabel}
              onChange={(e) => update('dayLabel', e.target.value)}
            />
            <p className="mt-1 text-[11px] text-neutral-400">Shown in blue on the timeline.</p>
          </div>
          <div className="md:col-span-2">
            <Label>Sub-title</Label>
            <Input
              className="mt-1.5"
              placeholder="Departure from Mumbai"
              value={flight.subtitle}
              onChange={(e) => update('subtitle', e.target.value)}
            />
            <p className="mt-1 text-[11px] text-neutral-400">Shown beside the day label, in black.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Departure (city)</Label>
            <Input
              className="mt-1.5"
              placeholder="Mumbai"
              value={flight.departureCity}
              onChange={(e) => update('departureCity', e.target.value)}
            />
          </div>
          <div>
            <Label>Stops</Label>
            <Select
              className="mt-1.5"
              value={flight.stops}
              onChange={(e) => update('stops', e.target.value)}
            >
              {STOP_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Arrival (city)</Label>
            <Input
              className="mt-1.5"
              placeholder="Jeddah"
              value={flight.arrivalCity}
              onChange={(e) => update('arrivalCity', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Departure time</Label>
            <Input
              className="mt-1.5"
              placeholder="04:15"
              value={flight.departureTime}
              onChange={(e) => update('departureTime', e.target.value)}
            />
          </div>
          <div>
            <Label>Arrival time</Label>
            <Input
              className="mt-1.5"
              placeholder="08:30"
              value={flight.arrivalTime}
              onChange={(e) => update('arrivalTime', e.target.value)}
            />
          </div>
          <div>
            <Label>Flight info</Label>
            <Input
              className="mt-1.5"
              placeholder="Air India AI-2243"
              value={flight.flightInfo}
              onChange={(e) => update('flightInfo', e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <NcModal
      isOpenProp={isOpen}
      onCloseModal={closeModal}
      modalTitle={
        isLoadingPackage ? null : (
          <div className="flex items-center justify-between gap-2 text-left">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 sm:text-base">
              {editPackageId ? 'Edit' : 'Add Package'}
            </span>
            <span className="flex items-center gap-2">
              <ButtonSecondary
                type="button"
                onClick={() => handlePublish(false)}
                disabled={isSaving}
                sizeClass="px-3.5 py-2"
                fontSize="text-xs sm:text-sm font-medium"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </ButtonSecondary>
              <ButtonPrimary
                type="button"
                onClick={() => handlePublish(true)}
                disabled={isSaving}
                sizeClass="px-3.5 py-2"
                fontSize="text-xs sm:text-sm font-medium"
              >
                {isSaving ? 'Saving…' : 'Save & Publish'}
              </ButtonPrimary>
            </span>
          </div>
        )
      }
      contentExtraClass="max-w-5xl"
      contentPaddingClass="px-4 pb-5 pt-4 md:px-6 md:pb-6"
      renderTrigger={
        triggerless
          ? () => null
          : (openModal) => (
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
            )
      }
      renderContent={() => (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
          {isLoadingPackage ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Loading package data...
            </p>
          ) : (
            <>
              <div className="shrink-0 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
                <div className="flex min-w-max items-start">
                  {WIZARD_STEPS.map((wizardStep, index) => {
                    const isActive = wizardStep === step;
                    const isComplete = completedSteps[wizardStep];
                    const prevComplete = index > 0 && completedSteps[WIZARD_STEPS[index - 1]];

                    return (
                      <React.Fragment key={wizardStep}>
                        {index > 0 && (
                          <div
                            className={`flex-1 border-t-2 border-dashed mt-4 min-w-[16px] ${
                              prevComplete
                                ? 'border-green-400 dark:border-green-600'
                                : 'border-neutral-300 dark:border-neutral-600'
                            }`}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => tryGoToStep(wizardStep)}
                          className="flex flex-col items-center gap-1.5 px-1"
                          aria-current={isActive ? 'step' : undefined}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                              isActive
                                ? 'bg-primary-6000 text-white ring-2 ring-primary-300 dark:ring-primary-700'
                                : isComplete
                                  ? 'bg-green-600 text-white'
                                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                            }`}
                          >
                            {isComplete ? (
                              <i className="las la-check text-sm" />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span
                            className={`w-20 text-center text-[11px] leading-snug font-medium ${
                              isActive
                                ? 'text-primary-700 dark:text-primary-300'
                                : 'text-neutral-500 dark:text-neutral-400'
                            }`}
                          >
                            {WIZARD_STEP_LABELS[wizardStep]}
                          </span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
                {step === 'meta' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                      <strong className="font-semibold">All fields below are required.</strong>{' '}
                      Complete every field — including title, dates, cities, hotel details, a
                      package image and a price for every enabled sharing tier — before you can
                      move to the next step.
                    </div>
                    <div className="md:col-span-2">
                      <Label>
                        Package Image <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-1.5 max-w-xs">
                        <ImageUpload
                          label=""
                          aspectRatio="wide"
                          currentImageUrl={currentImageUrl}
                          onFileSelected={(file) => setPendingImageFile(file)}
                        />
                      </div>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Upload is deferred until publish. The image will be stored under the
                        package folder.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Label>
                        Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        name="title"
                        className={`mt-1.5 ${errorBorderClass(metaErrors.title)}`}
                        value={meta.title}
                        onChange={handleMetaChange}
                        onBlur={handleMetaBlur}
                      />
                      {metaErrors.title ? (
                        <span className="mt-1 block text-xs text-red-600">{metaErrors.title}</span>
                      ) : null}
                      {(meta.title.trim() || meta.slug.trim()) && agentSlug ? (
                        <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          Your URL will be{' '}
                          <span className="font-mono text-neutral-700 dark:text-neutral-300">
                            searchumrah.com/{agentSlug}/
                            {slugifyShared(meta.slug.trim() || meta.title)}
                          </span>
                          {!editPackageId ? (
                            <span className="block text-neutral-400 dark:text-neutral-500 mt-0.5">
                              A `-2`, `-3`, … suffix is added automatically if this slug is already in use.
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                    <div className="md:col-span-2">
                      <Label>Highlight Tags</Label>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Pick the chips that best describe this package. They appear on listing
                        cards and help pilgrims filter.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {PACKAGE_TAGS.map((tag) => {
                          const active = selectedTags.includes(tag);
                          const tone = packageTagTone(tag);
                          const toneClasses =
                            tone === 'popular'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-primary-50 text-primary-700 border-primary-100';
                          const activeRing =
                            tone === 'popular'
                              ? 'ring-2 ring-amber-500 ring-offset-1'
                              : 'ring-2 ring-primary-500 ring-offset-1';
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() =>
                                setSelectedTags((prev) =>
                                  prev.includes(tag)
                                    ? prev.filter((t) => t !== tag)
                                    : [...prev, tag]
                                )
                              }
                              aria-pressed={active}
                              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium border transition ${toneClasses} ${
                                active ? activeRing : 'opacity-70 hover:opacity-100'
                              }`}
                            >
                              {active ? <span aria-hidden>✓</span> : null}
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label>
                        Short Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        name="short_description"
                        className={`mt-1.5 ${errorBorderClass(metaErrors.short_description)}`}
                        value={meta.short_description}
                        onChange={handleMetaChange}
                        onBlur={handleMetaBlur}
                        rows={3}
                      />
                      {metaErrors.short_description ? (
                        <span className="mt-1 block text-xs text-red-600">
                          {metaErrors.short_description}
                        </span>
                      ) : null}
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Auto-filled from days, route, dates, and price. Edit to add your own
                        marketing copy — clear it to restore the auto-generated version.
                      </p>
                    </div>
                    <div>
                      <Label>
                        Departure Date <span className="text-red-500">*</span>
                      </Label>
                      <DateSegmentInput
                        name="departure_date"
                        className="mt-1.5"
                        value={meta.departure_date}
                        onChange={handleMetaChange}
                        invalid={Boolean(metaErrors.departure_date)}
                      />
                      {metaErrors.departure_date ? (
                        <span className="mt-1 block text-xs text-red-600">
                          {metaErrors.departure_date}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <Label>
                        Arrival Date <span className="text-red-500">*</span>
                      </Label>
                      <DateSegmentInput
                        name="arrival_date"
                        className="mt-1.5"
                        value={meta.arrival_date}
                        onChange={handleMetaChange}
                        invalid={Boolean(metaErrors.arrival_date)}
                      />
                      {metaErrors.arrival_date ? (
                        <span className="mt-1 block text-xs text-red-600">
                          {metaErrors.arrival_date}
                        </span>
                      ) : null}
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>
                          Departure City <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          name="departure_city"
                          className={`mt-1.5 ${errorBorderClass(metaErrors.departure_city)}`}
                          value={meta.departure_city}
                          onChange={handleMetaChange}
                          onBlur={handleMetaBlur}
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
                        {metaErrors.departure_city ? (
                          <span className="mt-1 block text-xs text-red-600">
                            {metaErrors.departure_city}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <Label>
                          Arrival City <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          name="arrival_city"
                          className={`mt-1.5 ${errorBorderClass(metaErrors.arrival_city)}`}
                          value={meta.arrival_city}
                          onChange={handleMetaChange}
                          onBlur={handleMetaBlur}
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
                        {metaErrors.arrival_city ? (
                          <span className="mt-1 block text-xs text-red-600">
                            {metaErrors.arrival_city}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <Label>
                        Total Days <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        name="total_duration_days"
                        type="number"
                        className={`mt-1.5 ${errorBorderClass(metaErrors.total_duration_days)}`}
                        value={meta.total_duration_days}
                        onChange={handleMetaChange}
                        onBlur={handleMetaBlur}
                        placeholder="Auto from dates"
                      />
                      {metaErrors.total_duration_days ? (
                        <span className="mt-1 block text-xs text-red-600">
                          {metaErrors.total_duration_days}
                        </span>
                      ) : null}
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Auto-filled from your departure & arrival dates. Override if needed.
                      </p>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>
                          Makkah Days <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          name="makkah_days"
                          type="number"
                          className={`mt-1.5 ${errorBorderClass(metaErrors.makkah_days)}`}
                          value={meta.makkah_days}
                          onChange={handleMetaChange}
                          onBlur={handleMetaBlur}
                        />
                        {metaErrors.makkah_days ? (
                          <span className="mt-1 block text-xs text-red-600">
                            {metaErrors.makkah_days}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <Label>
                          Madinah Days <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          name="madinah_days"
                          type="number"
                          className={`mt-1.5 ${errorBorderClass(metaErrors.madinah_days)}`}
                          value={meta.madinah_days}
                          onChange={handleMetaChange}
                          onBlur={handleMetaBlur}
                          placeholder="Auto from Total − Makkah"
                        />
                        {metaErrors.madinah_days ? (
                          <span className="mt-1 block text-xs text-red-600">
                            {metaErrors.madinah_days}
                          </span>
                        ) : null}
                      </div>
                      {(() => {
                        // Inline mismatch hint when Makkah + Madinah doesn't
                        // equal Total. Doesn't block save — agents sometimes
                        // include travel days in one bucket — but flags the
                        // discrepancy so it isn't accidental.
                        const total = Number(meta.total_duration_days);
                        const mak = Number(meta.makkah_days);
                        const mad = Number(meta.madinah_days);
                        if (![total, mak, mad].every((n) => Number.isFinite(n) && n > 0)) {
                          return null;
                        }
                        const sum = mak + mad;
                        if (sum === total) {
                          return (
                            <p className="md:col-span-2 text-xs text-green-600 dark:text-green-400">
                              <i className="las la-check-circle mr-1" />
                              {mak} + {mad} = {total} days. Balanced.
                            </p>
                          );
                        }
                        return (
                          <p className="md:col-span-2 text-xs text-amber-600 dark:text-amber-400">
                            <i className="las la-exclamation-triangle mr-1" />
                            Makkah + Madinah = {sum}, but Total Days is {total}. Difference of{' '}
                            {Math.abs(sum - total)} day{Math.abs(sum - total) === 1 ? '' : 's'}.
                          </p>
                        );
                      })()}
                    </div>
                    <div>
                      <Label>Location (from your profile)</Label>
                      <div className="mt-1.5 flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50">
                        <span className="text-sm">
                          {(agentCity || '').trim() || 'Not set'}
                        </span>
                        <Link
                          href="/profile"
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Edit profile
                        </Link>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Pilgrims will find this package under this city in the location filter.
                      </p>
                    </div>
                    {/* Hotel info: name + walking distance grouped into one card
                        per city. Stars and amenities live in the Stay Info
                        step (separate visual section so the meta step stays
                        scannable). */}
                    {(
                      [
                        {
                          city: 'Makkah',
                          nameField: 'makkah_hotel_name' as const,
                          distField: 'makkah_hotel_distance_m' as const,
                          landmark: 'Masjid al-Haram',
                          icon: 'la-kaaba',
                        },
                        {
                          city: 'Madinah',
                          nameField: 'madinah_hotel_name' as const,
                          distField: 'madinah_hotel_distance_m' as const,
                          landmark: 'Masjid an-Nabawi',
                          icon: 'la-mosque',
                        },
                      ] as const
                    ).map(({ city, nameField, distField, landmark, icon }) => {
                      const distanceM = Number(meta[distField]);
                      const km = Number.isFinite(distanceM) && distanceM > 0 ? distanceM / 1000 : null;
                      return (
                        <div
                          key={city}
                          className="md:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3"
                        >
                          <div className="flex items-center gap-2">
                            <i className={`las ${icon} text-lg text-primary-6000`} aria-hidden />
                            <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                              {city} Hotel
                            </h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                            <div>
                              <Label className="text-xs">
                                Hotel name <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                name={nameField}
                                className={`mt-1.5 ${errorBorderClass(metaErrors[nameField])}`}
                                value={meta[nameField]}
                                onChange={handleMetaChange}
                                onBlur={handleMetaBlur}
                                placeholder={`e.g. ${city === 'Makkah' ? 'Pullman Zamzam' : 'Anwar Al Madinah Mövenpick'}`}
                              />
                              {metaErrors[nameField] ? (
                                <span className="mt-1 block text-xs text-red-600">
                                  {metaErrors[nameField]}
                                </span>
                              ) : null}
                            </div>
                            <div>
                              <Label className="text-xs">
                                Walking distance (m) <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                name={distField}
                                type="number"
                                className={`mt-1.5 ${errorBorderClass(metaErrors[distField])}`}
                                value={meta[distField]}
                                onChange={handleMetaChange}
                                onBlur={handleMetaBlur}
                                placeholder="e.g. 250"
                              />
                              {metaErrors[distField] ? (
                                <span className="mt-1 block text-xs text-red-600">
                                  {metaErrors[distField]}
                                </span>
                              ) : null}
                              {km !== null ? (
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                  ≈ {km.toFixed(km < 1 ? 2 : 1)} km from {landmark}
                                </p>
                              ) : (
                                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                                  Distance from {landmark}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="md:col-span-2 space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
                      <div>
                        <Label>
                          Sharing Rates ({meta.currency || 'INR'} per person){' '}
                          <span className="text-red-500">*</span>
                        </Label>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          Toggle on each sharing option you actually offer. Fewer people per
                          room = more privacy = higher price. The cheapest tier (most people
                          per room) is automatically the{' '}
                          <span className="font-medium">Default</span> — its rate is what
                          appears as the per-person price on package cards. Every enabled tier
                          needs a price before you can continue.
                        </p>
                      </div>

                      {/* Toggle row: turn each tier on/off. Removing the last
                          enabled tier is blocked — there must be at least one
                          price quoted or the package would have nothing to
                          sell. */}
                      <div className="flex flex-wrap gap-2">
                        {SUPPORTED_SHARING_PEOPLE.map((people) => {
                          const enabled = sharingRates.some((r) => r.people === people);
                          const wouldBeLast = enabled && sharingRates.length === 1;
                          return (
                            <button
                              key={people}
                              type="button"
                              disabled={wouldBeLast}
                              onClick={() =>
                                setSharingRates((prev) =>
                                  toggleSharingTier(prev, people, meta.price_per_person)
                                )
                              }
                              title={
                                wouldBeLast
                                  ? 'Keep at least one sharing option — packages need a price'
                                  : SHARING_PEOPLE_LABEL[people]
                              }
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                enabled
                                  ? 'border-primary-6000 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                  : 'border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-300'
                              } ${wouldBeLast ? 'cursor-not-allowed opacity-60' : ''}`}
                              aria-pressed={enabled}
                            >
                              {enabled ? <i className="las la-check text-sm" /> : null}
                              {people}-sharing
                            </button>
                          );
                        })}
                      </div>

                      {sharingRates.map((rate, idx) => {
                        const hint = SHARING_PEOPLE_LABEL[rate.people] || '';
                        const rateErr = sharingRateErrors[rate.people];
                        return (
                          <div key={rate.people} className="space-y-1">
                            <Label className="text-xs">
                              {rate.people}-sharing{hint ? ` (${hint})` : ''}{' '}
                              <span className="text-red-500">*</span>
                              {rate.default ? (
                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                  <i className="las la-check-circle" />
                                  Default · price shown on cards
                                </span>
                              ) : null}
                            </Label>
                            <Input
                              type="number"
                              value={rate.value}
                              className={errorBorderClass(rateErr)}
                              placeholder={
                                rate.default && meta.price_per_person
                                  ? meta.price_per_person
                                  : `Price per person in ${rate.people}-sharing room`
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                setSharingRates((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, value } : item
                                  )
                                );
                              }}
                              onBlur={(e) => {
                                const err = validateSharingRate(e.currentTarget.value);
                                setSharingRateErrors((prev) => {
                                  if (!err) {
                                    if (!(rate.people in prev)) return prev;
                                    const next = { ...prev };
                                    delete next[rate.people];
                                    return next;
                                  }
                                  return { ...prev, [rate.people]: err };
                                });
                              }}
                            />
                            {rateErr ? (
                              <span className="mt-1 block text-xs text-red-600">{rateErr}</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 'itinerary' && (
                  <div className="space-y-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Every itinerary opens and closes with a fixed flight block. Use{' '}
                      <span className="font-medium">Add day</span> to insert day cards in between —
                      each with a day label, sub-title, title, a rich-text description, and an icon
                      for the timeline.
                    </p>

                    {renderFlightBlock('Departure flight', startFlight, setStartFlight)}

                    {dayItems.map((item, idx) => {
                      const updateField = <K extends keyof DayItemInput>(
                        key: K,
                        value: DayItemInput[K]
                      ) => {
                        setDayItems((prev) =>
                          prev.map((entry, i) => (i === idx ? { ...entry, [key]: value } : entry))
                        );
                      };

                      return (
                        <div
                          key={idx}
                          className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 space-y-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-[12px] font-semibold">
                                {idx + 1}
                              </span>
                              <h4 className="font-medium">Day {idx + 1}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  className="text-xs text-primary-600 hover:underline"
                                  onClick={() =>
                                    setDayItems((prev) =>
                                      prev.map((entry, i) =>
                                        i === idx ? { ...prev[idx - 1] } : entry
                                      )
                                    )
                                  }
                                >
                                  <i className="las la-copy mr-1" />
                                  Copy from above
                                </button>
                              )}
                              <button
                                type="button"
                                className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={idx === 0}
                                onClick={() =>
                                  setDayItems((prev) => {
                                    if (idx === 0) return prev;
                                    const next = [...prev];
                                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                    return next;
                                  })
                                }
                                aria-label="Move up"
                              >
                                <i className="las la-arrow-up text-base" />
                              </button>
                              <button
                                type="button"
                                className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={idx === dayItems.length - 1}
                                onClick={() =>
                                  setDayItems((prev) => {
                                    if (idx === prev.length - 1) return prev;
                                    const next = [...prev];
                                    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                    return next;
                                  })
                                }
                                aria-label="Move down"
                              >
                                <i className="las la-arrow-down text-base" />
                              </button>
                              {dayItems.length > 1 && (
                                <button
                                  type="button"
                                  className="text-xs text-red-600 hover:underline"
                                  onClick={() =>
                                    setDayItems((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <Label>Icon</Label>
                            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                              Replaces the dot on the timeline. Pick one that matches this day&apos;s activity.
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => updateField('icon', '')}
                                aria-pressed={!item.icon}
                                title="No icon (default dot)"
                                className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                                  !item.icon
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-400'
                                }`}
                              >
                                <span className="block h-2.5 w-2.5 rounded-full bg-current" />
                              </button>
                              {ITERNARY_ICON_OPTIONS.map((opt) => {
                                const active = item.icon === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => updateField('icon', opt.id)}
                                    aria-pressed={active}
                                    title={opt.label}
                                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                                      active
                                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
                                    }`}
                                  >
                                    <i className={`${opt.className} text-lg leading-none`} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-1">
                              <Label>Day label</Label>
                              <Input
                                className="mt-1.5"
                                placeholder="Day 2"
                                value={item.dayLabel}
                                onChange={(e) => updateField('dayLabel', e.target.value)}
                              />
                              <p className="mt-1 text-[11px] text-neutral-400">
                                Shown in blue at the top of the row.
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <Label>Sub-title</Label>
                              <Input
                                className="mt-1.5"
                                placeholder="Ziyarat in Madinah"
                                value={item.subtitle}
                                onChange={(e) => updateField('subtitle', e.target.value)}
                              />
                              <p className="mt-1 text-[11px] text-neutral-400">
                                Shown beside the day label, in black.
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label>Title</Label>
                            <Input
                              className="mt-1.5"
                              placeholder="Stay at Pullman Zamzam Madinah"
                              value={item.title}
                              onChange={(e) => updateField('title', e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Description</Label>
                            <div className="mt-1.5">
                              <RichTextEditor
                                value={item.description}
                                onChange={(html) => updateField('description', html)}
                                placeholder="Ziyarat of Masjid Nabawi, Quba, Uhud, and the Seven Mosques. Daily breakfast & dinner."
                                minHeightClassName="min-h-[140px]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <ButtonSecondary
                      type="button"
                      onClick={() => setDayItems((prev) => [...prev, makeEmptyDay()])}
                    >
                      <i className="las la-plus mr-1.5" />
                      Add day
                    </ButtonSecondary>

                    {renderFlightBlock('Return flight', endFlight, setEndFlight)}
                  </div>
                )}

                {step === 'amenities' && (
                  <div className="space-y-6">
                    <div>
                      <Label>Inclusions</Label>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Pick an icon, type a label, and add it. Each row appears in the
                        package&apos;s Inclusions list as an icon next to its label.
                      </p>
                    </div>

                    <div>
                      <Label>Icon</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {AMENITY_ICON_OPTIONS.map((opt) => {
                          const active = amenityDraftIcon === opt.className;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAmenityDraftIcon(opt.className)}
                              aria-pressed={active}
                              title={opt.label}
                              className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                                active
                                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
                              }`}
                            >
                              <i className={`${opt.className} text-lg leading-none`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
                      <div>
                        <Label>Label</Label>
                        <Input
                          className="mt-1.5"
                          placeholder="Return flight"
                          value={amenityDraftLabel}
                          onChange={(e) => setAmenityDraftLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addAmenity();
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>Sub-heading</Label>
                        <Input
                          className="mt-1.5"
                          placeholder="Direct Mumbai – Madinah (optional)"
                          value={amenityDraftDescription}
                          onChange={(e) => setAmenityDraftDescription(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addAmenity();
                            }
                          }}
                        />
                      </div>
                      <div className="flex justify-stretch sm:justify-end pt-1">
                        <ButtonPrimary
                          type="button"
                          className="w-full sm:w-auto"
                          sizeClass="px-3.5 py-2"
                          fontSize="text-xs sm:text-sm font-medium"
                          onClick={addAmenity}
                          disabled={!amenityDraftLabel.trim()}
                        >
                          <i className="las la-plus mr-1.5" />
                          Add
                        </ButtonPrimary>
                      </div>
                    </div>

                    <div>
                      <Label>Added inclusions</Label>
                      {amenities.length === 0 ? (
                        <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">
                          Nothing added yet. Pick an icon, type a label, and press Add.
                        </p>
                      ) : (
                        <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-700 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                          {amenities.map((item, idx) => (
                            <li
                              key={`${item.name}-${idx}`}
                              className="flex items-center gap-3 px-3 py-3"
                            >
                              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                <i
                                  className={`${amenityIconClass(item.icon)} text-base leading-none`}
                                  aria-hidden
                                />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                                  {item.name}
                                </div>
                                {item.description ? (
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                    {item.description}
                                  </div>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 transition"
                                onClick={() => removeAmenity(idx)}
                                aria-label={`Remove ${item.name}`}
                                title="Remove"
                              >
                                <i className="las la-trash text-base leading-none" aria-hidden />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {step === 'stay' && (
                  <div className="space-y-5">
                    <div>
                      <Label>Sub-heading</Label>
                      <Textarea
                        className="mt-1.5"
                        rows={2}
                        placeholder="Both hotels are within walking distance of the Haram and Masjid Nabawi — chosen for ease of access during prayer times."
                        value={stayInfoLede}
                        onChange={(e) => setStayInfoLede(e.target.value)}
                      />
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Shown above the hotel cards in the &ldquo;Where you&rsquo;ll stay&rsquo;&rsquo; section. Leave blank to use the default.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <HotelTagsField
                        label="Makkah hotel tags"
                        stars={makkahHotelStars}
                        onStarsChange={setMakkahHotelStars}
                        amenities={makkahHotelAmenities}
                        onAmenitiesChange={setMakkahHotelAmenities}
                      />
                      <HotelTagsField
                        label="Madinah hotel tags"
                        stars={madinahHotelStars}
                        onStarsChange={setMadinahHotelStars}
                        amenities={madinahHotelAmenities}
                        onAmenitiesChange={setMadinahHotelAmenities}
                      />
                    </div>

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
                        <Select
                          className="mt-1.5"
                          value={policyCheckIn}
                          onChange={(e) => setPolicyCheckIn(e.target.value)}
                        >
                          <option value="">Select check-in time</option>
                          {policyCheckIn && !POLICY_TIME_OPTIONS.includes(policyCheckIn) ? (
                            <option value={policyCheckIn}>{policyCheckIn}</option>
                          ) : null}
                          {POLICY_TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>Check-out Time</Label>
                        <Select
                          className="mt-1.5"
                          value={policyCheckOut}
                          onChange={(e) => setPolicyCheckOut(e.target.value)}
                        >
                          <option value="">Select check-out time</option>
                          {policyCheckOut && !POLICY_TIME_OPTIONS.includes(policyCheckOut) ? (
                            <option value={policyCheckOut}>{policyCheckOut}</option>
                          ) : null}
                          {POLICY_TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Special Notes (one per line)</Label>
                      <div className="mt-1.5">
                        <RichTextEditor
                          value={policyNotesText}
                          onChange={setPolicyNotesText}
                          placeholder="Add special notes..."
                          minHeightClassName="min-h-[180px]"
                        />
                      </div>
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                        Each line or list item will be saved as a separate note.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              <div className="shrink-0 flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                <ButtonSecondary
                  type="button"
                  className="w-full sm:w-auto"
                  sizeClass="px-3.5 py-2"
                  fontSize="text-xs sm:text-sm font-medium"
                  onClick={goBack}
                  disabled={isFirstStep || isSaving}
                >
                  Back
                </ButtonSecondary>
                {isLastStep ? (
                  <ButtonPrimary
                    type="button"
                    className="w-full sm:w-auto"
                    sizeClass="px-3.5 py-2"
                    fontSize="text-xs sm:text-sm font-medium"
                    onClick={() => handlePublish(true)}
                    disabled={isSaving}
                  >
                    {isSaving
                      ? 'Saving...'
                      : editPackageId
                        ? isDraftPackage
                          ? 'Publish Package'
                          : 'Save Changes'
                        : 'Publish Package'}
                  </ButtonPrimary>
                ) : (
                  <ButtonPrimary
                    type="button"
                    className="w-full sm:w-auto"
                    sizeClass="px-3.5 py-2"
                    fontSize="text-xs sm:text-sm font-medium"
                    onClick={goNext}
                    disabled={isSaving}
                  >
                    Next
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
