import { supabase } from '@/utils/supabaseClient';
import { Package } from '@/data/types';

export type SortValue = '' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

export type PackagesFilterPayload = {
  // Legacy freeform location text. Kept for backwards compat with old URLs
  // that pre-date the cities table. Resolved to citySlugs by buildPackagesQueryArgs
  // when ?city= is absent (soft fallback).
  location?: string[];
  // New structured location filter. Each entry is a cities.slug — the listings
  // query joins via packages_with_agent.package_city_slug. Multi-select.
  citySlugs?: string[];
  // Whether the active citySlugs came from explicit user pick (URL ?city=)
  // or from soft-resolving a legacy ?location= text param. Affects relaxation
  // copy: a resolved fallback should be relaxed before an explicit city pick.
  citySlugsFromFallback?: boolean;
  datestart?: string;
  dateend?: string;
  total_duration_days?: string | number;
  months?: number[];
  year?: number;
  price?: string | number;
  makkahHotelDistance?: number;
  madinahHotelDistance?: number;
  agentNameList?: string[];
};

// Filter keys that can be auto-relaxed when an exact search yields zero
// results. Order = drop priority (first entry is dropped first). Pilgrims
// typically can't substitute location, dates, or a specific agent, so those
// sit at the bottom and are preserved. Hotel distance is the most flexible
// "nice to have" and is relaxed first.
export type RelaxableKey =
  | 'madinahHotelDistance'
  | 'makkahHotelDistance'
  | 'price'
  | 'total_duration_days'
  | 'months'
  | 'dateend'
  | 'datestart'
  | 'citySlugs';

// Order = drop priority (first entry relaxes first). Location sits late
// because a pilgrim is most committed to the city they typed; we widen
// other filters first, then expand the geographic radius, then finally
// drop the location filter entirely.
const RELAXATION_PRIORITY: RelaxableKey[] = [
  'madinahHotelDistance',
  'makkahHotelDistance',
  'price',
  'total_duration_days',
  'months',
  'dateend',
  'datestart',
  'citySlugs',
];

export type RelaxedFilter = {
  key: RelaxableKey;
  // Short name of the filter type, e.g. "Makkah hotel", "Month", "Price".
  filterLabel: string;
  // What the user actually asked for, e.g. "≤ 250 m" or "Jun".
  originalValueLabel: string;
  // What we widened it to. Omitted for "drop" kind (filter fully removed).
  relaxedValueLabel?: string;
  // 'widen' = threshold loosened by one step (e.g. 250m → 500m); the user's
  // intent is preserved, just a bit fuzzier. 'drop' = filter removed entirely
  // because no widening was enough.
  kind: 'widen' | 'drop';
  // URL search-param keys to delete when the user accepts this relaxation
  // permanently (banner chip click).
  urlKeys: string[];
};

const formatDistanceLabel = (m: number) => {
  if (m < 1000) return `${m} m`;
  const km = Math.floor(m / 1000);
  const rem = m % 1000;
  return rem > 0 ? `${km} km ${rem} m` : `${km} km`;
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthsToLabel = (months: number[]) =>
  months
    .slice()
    .sort((a, b) => a - b)
    .map((m) => MONTH_LABELS[m - 1])
    .filter(Boolean)
    .join(', ');

const uniqAscNumbers = (arr: number[]): number[] =>
  Array.from(new Set(arr.filter((n) => Number.isFinite(n)))).sort((a, b) => a - b);

// urlKeys() — search-param names the banner clears when the user accepts
// a relaxation permanently. Kept in one place so it stays in sync with the
// individual filter components (HotelDistanceFilter, MonthFilter, etc).
function urlKeysFor(key: RelaxableKey): string[] {
  switch (key) {
    case 'madinahHotelDistance':
      return ['madinah_hotel_distance_m'];
    case 'makkahHotelDistance':
      return ['makkah_hotel_distance_m'];
    case 'price':
      return ['price'];
    case 'total_duration_days':
      return ['total_duration_days'];
    case 'months':
      return ['month'];
    case 'dateend':
      return ['dateend'];
    case 'datestart':
      return ['datestart'];
    case 'citySlugs':
      // Clearing both city and the legacy location param so the two
      // contracts can't disagree after the user accepts a relaxation.
      return ['city', 'location'];
  }
}

function originalValueLabel(key: RelaxableKey, payload: PackagesFilterPayload): string | null {
  switch (key) {
    case 'madinahHotelDistance':
      return payload.madinahHotelDistance === undefined
        ? null
        : `≤ ${formatDistanceLabel(payload.madinahHotelDistance)}`;
    case 'makkahHotelDistance':
      return payload.makkahHotelDistance === undefined
        ? null
        : `≤ ${formatDistanceLabel(payload.makkahHotelDistance)}`;
    case 'price': {
      const n = toNum(payload.price);
      return n === undefined ? null : `≤ ${n.toLocaleString()}`;
    }
    case 'total_duration_days': {
      const n = toNum(payload.total_duration_days);
      return n === undefined ? null : `≤ ${n} day${n === 1 ? '' : 's'}`;
    }
    case 'months':
      return payload.months?.length ? monthsToLabel(payload.months) : null;
    case 'dateend':
      return payload.dateend ? `Return by ${payload.dateend}` : null;
    case 'datestart':
      return payload.datestart ? `Depart from ${payload.datestart}` : null;
    case 'citySlugs':
      // Show the user's original city pick(s) — the readable name lookup
      // happens in the ladder builder which has DB access; here we just
      // surface the slugs in case the ladder hasn't been built yet.
      return payload.citySlugs?.length ? payload.citySlugs.join(', ') : null;
  }
}

const FILTER_LABEL: Record<RelaxableKey, string> = {
  madinahHotelDistance: 'Madinah hotel',
  makkahHotelDistance: 'Makkah hotel',
  price: 'Price',
  total_duration_days: 'Duration',
  months: 'Month',
  dateend: 'Return date',
  datestart: 'Depart date',
  citySlugs: 'Location',
};

function stripFilter(payload: PackagesFilterPayload, key: RelaxableKey): PackagesFilterPayload {
  const next = { ...payload };
  switch (key) {
    case 'madinahHotelDistance':
      next.madinahHotelDistance = undefined;
      break;
    case 'makkahHotelDistance':
      next.makkahHotelDistance = undefined;
      break;
    case 'price':
      next.price = '';
      break;
    case 'total_duration_days':
      next.total_duration_days = '';
      break;
    case 'months':
      next.months = [];
      break;
    case 'dateend':
      next.dateend = '';
      break;
    case 'datestart':
      next.datestart = '';
      break;
    case 'citySlugs':
      // Drop both the structured slugs AND the legacy location text so
      // fetchPackages doesn't fall back to ilike on the freeform name.
      next.citySlugs = [];
      next.location = [];
      next.citySlugsFromFallback = false;
      break;
  }
  return next;
}

// A single rung on a filter's relaxation ladder. Steps are ordered: the
// earliest steps preserve the most user intent (smallest widening); the
// last step always drops the filter entirely. The relaxation search picks
// at most one step per filter and composes them.
type LadderStep = {
  apply: (p: PackagesFilterPayload) => PackagesFilterPayload;
  relaxedValueLabel: string;
  kind: 'widen' | 'drop';
};

// Radii used for the location step's relaxation ladder. Tuned for India:
// 75km = same metro / adjacent district; 200km = same region (Akola →
// Amravati, Nagpur); 500km = same state cluster.
const CITY_PROXIMITY_RADII_M = [75_000, 200_000, 500_000];

async function buildLadder(
  payload: PackagesFilterPayload,
  key: RelaxableKey
): Promise<LadderStep[]> {
  switch (key) {
    case 'makkahHotelDistance':
    case 'madinahHotelDistance': {
      const v = key === 'makkahHotelDistance'
        ? payload.makkahHotelDistance
        : payload.madinahHotelDistance;
      if (v === undefined) return [];
      // Multiplicative-ish widening capped at 5 km (typical filter ceiling).
      const candidates = uniqAscNumbers(
        [v + 250, Math.ceil(v * 1.5), v * 2, v + 1000, 5000]
          .map((x) => Math.round(x))
          .filter((x) => x > v && x <= 5000)
      );
      const steps: LadderStep[] = candidates.map((newV) => ({
        apply: (p) => ({ ...p, [key]: newV }) as PackagesFilterPayload,
        relaxedValueLabel: `≤ ${formatDistanceLabel(newV)}`,
        kind: 'widen',
      }));
      steps.push({
        apply: (p) => stripFilter(p, key),
        relaxedValueLabel: 'Any distance',
        kind: 'drop',
      });
      return steps;
    }
    case 'price': {
      const n = toNum(payload.price);
      if (n === undefined) return [];
      const candidates = uniqAscNumbers(
        [n * 1.15, n * 1.3, n * 1.5, n * 2].map((x) => Math.ceil(x)).filter((x) => x > n)
      );
      const steps: LadderStep[] = candidates.map((newV) => ({
        apply: (p) => ({ ...p, price: newV }),
        relaxedValueLabel: `≤ ${newV.toLocaleString()}`,
        kind: 'widen',
      }));
      steps.push({
        apply: (p) => stripFilter(p, 'price'),
        relaxedValueLabel: 'Any price',
        kind: 'drop',
      });
      return steps;
    }
    case 'total_duration_days': {
      const n = toNum(payload.total_duration_days);
      if (n === undefined) return [];
      const candidates = uniqAscNumbers([n + 2, n + 5, n + 10, n + 21].filter((x) => x > n));
      const steps: LadderStep[] = candidates.map((newV) => ({
        apply: (p) => ({ ...p, total_duration_days: newV }),
        relaxedValueLabel: `≤ ${newV} days`,
        kind: 'widen',
      }));
      steps.push({
        apply: (p) => stripFilter(p, 'total_duration_days'),
        relaxedValueLabel: 'Any duration',
        kind: 'drop',
      });
      return steps;
    }
    case 'months': {
      const months = payload.months;
      if (!months?.length) return [];
      const minM = Math.min(...months);
      const maxM = Math.max(...months);
      const widenedSets: number[][] = [];
      for (const radius of [1, 2]) {
        const set = new Set<number>(months);
        for (let i = minM - radius; i <= maxM + radius; i++) {
          const m = ((i - 1 + 12) % 12) + 1;
          set.add(m);
        }
        const arr = Array.from(set).sort((a, b) => a - b);
        if (arr.length > months.length) widenedSets.push(arr);
      }
      const steps: LadderStep[] = widenedSets.map((arr) => ({
        apply: (p) => ({ ...p, months: arr }),
        relaxedValueLabel: monthsToLabel(arr),
        kind: 'widen',
      }));
      steps.push({
        apply: (p) => stripFilter(p, 'months'),
        relaxedValueLabel: 'Any month',
        kind: 'drop',
      });
      return steps;
    }
    case 'datestart':
      if (!payload.datestart) return [];
      return [
        {
          apply: (p) => stripFilter(p, 'datestart'),
          relaxedValueLabel: 'Any depart date',
          kind: 'drop',
        },
      ];
    case 'dateend':
      if (!payload.dateend) return [];
      return [
        {
          apply: (p) => stripFilter(p, 'dateend'),
          relaxedValueLabel: 'Any return date',
          kind: 'drop',
        },
      ];
    case 'citySlugs': {
      const slugs = payload.citySlugs;
      if (!slugs?.length) return [];

      // Resolve the user's pick(s) to readable names so the banner can say
      // "within 200 km of Akola" instead of "of akola-in-mh".
      const { data: pickRows } = await supabase
        .from('cities')
        .select('slug, name, admin1_name')
        .in('slug', slugs);
      const labelFor = new Map<string, string>();
      for (const row of (pickRows ?? []) as Array<{
        slug: string;
        name: string;
        admin1_name: string | null;
      }>) {
        labelFor.set(row.slug, row.admin1_name ? `${row.name}, ${row.admin1_name}` : row.name);
      }
      const originLabel = slugs
        .map((s) => labelFor.get(s) ?? s)
        .join(' / ');

      // Pre-compute the proximity expansions (one RPC per radius per slug,
      // all in parallel). Each step's slug set is the union of the user's
      // picks + every nearby city within the radius for each pick. Skip a
      // radius if it adds nothing new (e.g. dense metros where 75km == 200km).
      const expansions = await Promise.all(
        CITY_PROXIMITY_RADII_M.map(async (radius) => {
          const perPick = await Promise.all(
            slugs.map(async (slug) => {
              const { data } = await supabase.rpc('nearby_cities', {
                p_slug: slug,
                p_radius_m: radius,
              });
              return ((data ?? []) as Array<{ slug: string }>).map((r) => r.slug);
            })
          );
          const union = new Set<string>(slugs);
          for (const arr of perPick) for (const s of arr) union.add(s);
          return { radius, slugs: Array.from(union) };
        })
      );

      const steps: LadderStep[] = [];
      let lastSize = slugs.length;
      for (const e of expansions) {
        if (e.slugs.length <= lastSize) continue; // no new cities at this radius
        lastSize = e.slugs.length;
        const expanded = e.slugs;
        steps.push({
          apply: (p) => ({ ...p, citySlugs: expanded }),
          relaxedValueLabel: `within ${Math.round(e.radius / 1000)} km of ${originLabel}`,
          kind: 'widen',
        });
      }
      steps.push({
        apply: (p) => stripFilter(p, 'citySlugs'),
        relaxedValueLabel: 'Any location',
        kind: 'drop',
      });
      return steps;
    }
  }
}

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

/**
 * Build the Packages query args from URL params.
 * Works on both server (plain object → wrap getter) and client (URLSearchParams.get).
 */
export function buildPackagesQueryArgs(
  getParam: (key: string) => string | null
): { payload: PackagesFilterPayload; sort: SortValue } {
  const splitCsv = (key: string) =>
    (getParam(key) || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const monthList = splitCsv('month');
  const months = monthList.map((m) => MONTH_NAME_TO_NUMBER[m]).filter(Boolean);

  const priceParam = getParam('price') || '';
  const makkahParam = getParam('makkah_hotel_distance_m');
  const madinahParam = getParam('madinah_hotel_distance_m');

  const payload: PackagesFilterPayload = {
    location: splitCsv('location'),
    citySlugs: splitCsv('city'),
    datestart: getParam('datestart') || '',
    dateend: getParam('dateend') || '',
    total_duration_days: getParam('total_duration_days') || '',
    months,
    year: new Date().getFullYear(),
    price: priceParam ? Number(priceParam) : '',
    makkahHotelDistance: makkahParam ? Number(makkahParam) : undefined,
    madinahHotelDistance: madinahParam ? Number(madinahParam) : undefined,
    agentNameList: splitCsv('agent_name'),
  };

  const sort = (getParam('sort') || '') as SortValue;

  return { payload, sort };
}

const PACKAGE_FIELDS = [
  'id',
  'slug',
  'title',
  'agent_name',
  'agent_known_as',
  'agent_profile_image',
  'agent_rating_avg',
  'agent_rating_total',
  'thumbnail_url',
  'thumbnail_blur',
  'price_per_person',
  'currency',
  'default_pricing',
  'sharing_rate',
  'total_duration_days',
  'departure_city',
  'arrival_city',
  'departure_date',
  'arrival_date',
  'package_location',
  'makkah_hotel_name',
  'makkah_hotel_distance_m',
  'madinah_hotel_name',
  'madinah_hotel_distance_m',
].join(', ');

// `tags` was added in a later migration. If the host hasn't applied
// `20260511010000_add_tags_to_packages.sql` yet, including it in the SELECT
// makes the whole query fail with "column packages.tags does not exist". We
// query without it first and ONLY add it once we know it's available.
const PACKAGE_FIELDS_WITH_TAGS = `${PACKAGE_FIELDS}, tags`;
let tagsColumnAvailable: boolean | null = null;

const toNum = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const isMissingTagsColumn = (err: { message?: string; code?: string } | null | undefined) => {
  if (!err) return false;
  const message = (err.message || '').toLowerCase();
  return (
    err.code === '42703' ||
    (message.includes('column') && message.includes('tags') && message.includes('does not exist'))
  );
};

/**
 * Soft-fallback resolver for legacy `?location=Akola,Mumbai` URLs.
 *
 * When the URL already carries the structured `?city=akola-in-mh` form,
 * this is a no-op. Otherwise we resolve each freeform name to its best
 * matching city slug via cities_autocomplete (trigram + population rank).
 *
 * The resolved payload sets citySlugsFromFallback=true so relaxation can
 * treat fallback-resolved cities as "softer" than explicit user picks — if
 * the user typed "Akol" and we resolved to Akola, we'd rather widen than
 * insist on the resolved city when other filters also fail.
 */
export async function resolvePackagesPayload(
  payload: PackagesFilterPayload
): Promise<PackagesFilterPayload> {
  // User picked from the autocomplete — already structured, nothing to do.
  if (payload.citySlugs?.length) return payload;

  if (!payload.location?.length) return payload;

  const slugs = await Promise.all(
    payload.location.map(async (name) => {
      const { data, error } = await supabase.rpc('cities_autocomplete', {
        p_query: name,
        p_country: 'IN',
        p_limit: 1,
      });
      if (error || !data || data.length === 0) return undefined;
      return (data[0] as { slug?: string }).slug;
    })
  );
  const resolved = slugs.filter((s): s is string => typeof s === 'string' && s.length > 0);
  if (resolved.length === 0) return payload;

  return { ...payload, citySlugs: resolved, citySlugsFromFallback: true };
}

export async function fetchPackages(args: {
  payload: PackagesFilterPayload;
  page: number;
  pageSize: number;
  sort: SortValue;
}): Promise<Package[]> {
  const { payload, page, pageSize, sort } = args;

  // Safety net for cases where an agent never logs in to trigger auto-unpublish:
  // hide packages whose departure_date is already in the past.
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Optimistically include `tags` until we confirm the column is missing on
  // this install; from then on, skip it for the rest of the process lifetime.
  const includeTags = tagsColumnAvailable !== false;
  const selectFields = includeTags ? PACKAGE_FIELDS_WITH_TAGS : PACKAGE_FIELDS;

  // Read from the `packages_with_agent` view (defined in
  // 20260512_normalize_package_agent_fields.sql). The view INNER JOINs
  // packages → agents so agent_known_as / agent_profile_image /
  // agent_rating_avg / agent_rating_total are sourced live from `agents`
  // instead of stale denormalized columns. Sort and filter on those fields
  // work natively against the view (e.g. .order('agent_rating_avg'),
  // .gte('agent_rating_avg', 4)).
  let query = supabase
    .from('packages_with_agent')
    .select(selectFields)
    .eq('published', true)
    .gte('departure_date', todayStr);

  // Prefer the structured city filter when present — it joins via
  // packages_with_agent.package_city_slug (sourced from agents.city_id) and
  // is the path that supports proximity relaxation. The legacy `location`
  // string filter is the fallback for old URLs that haven't gone through
  // resolvePackagesPayload yet (defensive: should normally be resolved
  // upstream and never hit this branch).
  if (payload.citySlugs?.length) {
    query = query.in('package_city_slug', payload.citySlugs);
  } else if (payload.location?.length) {
    query =
      payload.location.length === 1
        ? query.ilike('package_location', `%${payload.location[0]}%`)
        : query.in('package_location', payload.location);
  }

  if (payload.months?.length) {
    const year = payload.year ?? new Date().getFullYear();
    const ranges = payload.months.map((m) => {
      const mm = String(m).padStart(2, '0');
      const lastDay = new Date(year, m, 0).getDate();
      return `and(departure_date.gte.${year}-${mm}-01,departure_date.lte.${year}-${mm}-${lastDay})`;
    });
    query = query.or(ranges.join(','));
  }

  if (payload.datestart) query = query.gte('departure_date', payload.datestart);
  if (payload.dateend) query = query.lte('arrival_date', payload.dateend);

  const dur = toNum(payload.total_duration_days);
  if (dur !== undefined) query = query.lte('total_duration_days', dur);

  const price = toNum(payload.price);
  if (price !== undefined) query = query.lte('price_per_person', price);

  if (payload.makkahHotelDistance !== undefined)
    query = query.lte('makkah_hotel_distance_m', payload.makkahHotelDistance);
  if (payload.madinahHotelDistance !== undefined)
    query = query.lte('madinah_hotel_distance_m', payload.madinahHotelDistance);

  if (payload.agentNameList?.length) query = query.in('agent_name', payload.agentNameList);

  switch (sort) {
    case 'price-asc':
      query = query.order('price_per_person', { ascending: true, nullsFirst: false });
      break;
    case 'price-desc':
      query = query.order('price_per_person', { ascending: false, nullsFirst: false });
      break;
    case 'rating':
      query = query.order('agent_rating_avg', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order('departure_date', { ascending: true, nullsFirst: false });
      break;
  }

  query = query.order('id', { ascending: true });

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await query.range(from, to);
  if (error) {
    // The host hasn't applied the tags migration yet. Latch the flag off and
    // retry the entire query with the legacy field list so the listing still
    // populates. Without this, the whole page renders empty until the SQL is
    // run.
    if (includeTags && isMissingTagsColumn(error)) {
      tagsColumnAvailable = false;
      return fetchPackages(args);
    }
    throw error;
  }

  if (includeTags && tagsColumnAvailable === null) {
    tagsColumnAvailable = true;
  }

  return (data ?? []) as unknown as Package[];
}

/**
 * Fast path: exact match only, with the legacy `?location=` resolution
 * baked in. Use this when you want results NOW and are happy to run
 * relaxation as a separate, lazy step.
 *
 * Why exists: the relaxation ladder can fire dozens of DB queries (one
 * fetchPackages per ladder step × filter combination). Blocking the UI on
 * that during typical filter changes makes search feel slow even though
 * the user's exact query is one round-trip away. Splitting lets the client
 * paint exact results first (Akola → empty in 100ms), then progressively
 * enhance with relaxation in the background ("Looking for nearby
 * alternatives…" banner).
 */
export async function fetchPackagesExact(args: {
  payload: PackagesFilterPayload;
  pageSize: number;
  sort: SortValue;
}): Promise<{ packages: Package[]; effectivePayload: PackagesFilterPayload }> {
  const payload = await resolvePackagesPayload(args.payload);
  const packages = await fetchPackages({
    payload,
    page: 0,
    pageSize: args.pageSize,
    sort: args.sort,
  });
  return { packages, effectivePayload: payload };
}

export type RelaxedFetchResult = {
  packages: Package[];
  relaxedFilters: RelaxedFilter[];
  // The effective payload after relaxation — pass this back on subsequent
  // pagination calls so page 2+ stays in sync with page 1's relaxed result set.
  effectivePayload: PackagesFilterPayload;
};

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  if (k === arr.length) return [arr.slice()];
  const [first, ...rest] = arr;
  return [
    ...combinations(rest, k - 1).map((c) => [first, ...c]),
    ...combinations(rest, k),
  ];
}

// Cartesian product across ladder steps for the chosen filters. Each entry
// in the result is one possible (filter → ladder step) selection.
function crossProduct<T>(arrs: T[][]): T[][] {
  return arrs.reduce<T[][]>(
    (acc, arr) => acc.flatMap((tuple) => arr.map((item) => [...tuple, item])),
    [[]]
  );
}

type LadderEntry = { key: RelaxableKey; steps: LadderStep[] };
type ChosenStep = { key: RelaxableKey; stepIdx: number; step: LadderStep };

// Hard ceiling on how many filters we'll relax simultaneously. At k>=3 the
// result barely resembles the user's intent ("we found something but we
// ignored 3 of the 6 things you asked for"), and the empty-state UX is
// strictly more honest.
const MAX_RELAXATION_K = 3;

// Candidates within each k-level are fired in parallel batches of this size.
// Sorting cheapest-first + stopping as soon as any batch yields results keeps
// the total request count low in the common case (results found quickly) while
// still exhausting all candidates in the pathological case (nothing matched).
const CASCADE_BATCH_SIZE = 4;

// Run the relaxation cascade against an already-resolved payload. Returns
// the best (least-relaxed, most-results) match found within MAX_RELAXATION_K,
// or empty if no rung satisfied the search.
//
// At k=1 we keep the full ladder cross-product so the "Booking.com nudge"
// works — e.g. Makkah 250m → 500m before "any distance". At k>=2 we collapse
// each chosen filter to its drop step only; intermediate widening across
// multiple filters explodes combinatorially (5^k candidates per subset) and
// rarely finds matches the simpler "drop these N filters" wouldn't also find.
async function runRelaxationCascade(
  payload: PackagesFilterPayload,
  pageSize: number,
  sort: SortValue
): Promise<RelaxedFetchResult> {
  const builtLadders = await Promise.all(
    RELAXATION_PRIORITY.map(async (key) => ({
      key,
      steps: await buildLadder(payload, key),
    }))
  );
  const ladders: LadderEntry[] = builtLadders.filter((l) => l.steps.length > 0);
  if (ladders.length === 0) {
    return { packages: [], relaxedFilters: [], effectivePayload: payload };
  }

  const maxK = Math.min(ladders.length, MAX_RELAXATION_K);

  for (let k = 1; k <= maxK; k++) {
    const subsets = combinations(ladders, k);
    const allCandidates: ChosenStep[][] = [];

    if (k === 1) {
      for (const subset of subsets) {
        const perFilterChoices: ChosenStep[][] = subset.map((entry) =>
          entry.steps.map((step, stepIdx) => ({ key: entry.key, stepIdx, step }))
        );
        const cross = crossProduct(perFilterChoices);
        for (const choice of cross) allCandidates.push(choice);
      }
    } else {
      // k>=2: single candidate per subset = drop every filter in the subset.
      for (const subset of subsets) {
        const candidate: ChosenStep[] = subset.map((entry) => {
          const lastIdx = entry.steps.length - 1;
          return { key: entry.key, stepIdx: lastIdx, step: entry.steps[lastIdx] };
        });
        allCandidates.push(candidate);
      }
    }

    // Sort cheapest-first (lowest total stepIdx = least relaxation) so the
    // first batch that yields results is already the closest to user intent.
    allCandidates.sort(
      (a, b) =>
        a.reduce((s, x) => s + x.stepIdx, 0) - b.reduce((s, x) => s + x.stepIdx, 0)
    );

    // Fire in batches; stop as soon as any batch returns non-empty results.
    let winners: Array<{ chosen: ChosenStep[]; packages: Package[]; effectivePayload: PackagesFilterPayload }> = [];
    for (let i = 0; i < allCandidates.length; i += CASCADE_BATCH_SIZE) {
      const batch = allCandidates.slice(i, i + CASCADE_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (chosen) => {
          let p = payload;
          for (const { step } of chosen) p = step.apply(p);
          const packages = await fetchPackages({ payload: p, page: 0, pageSize, sort });
          return { chosen, packages, effectivePayload: p };
        })
      );
      winners = batchResults.filter((c) => c.packages.length > 0);
      if (winners.length > 0) break;
    }
    if (winners.length === 0) continue;

    // Cost = sum of (stepIdx + 1) across relaxed filters. Lower cost ⇒ closer
    // to the user's original intent (smaller widening). Ties broken by which
    // candidate returned more results.
    winners.sort((a, b) => {
      const ac = a.chosen.reduce((s, x) => s + x.stepIdx + 1, 0);
      const bc = b.chosen.reduce((s, x) => s + x.stepIdx + 1, 0);
      if (ac !== bc) return ac - bc;
      return b.packages.length - a.packages.length;
    });
    const w = winners[0];

    const relaxed: RelaxedFilter[] = w.chosen.map(({ key, step }) => {
      const orig = originalValueLabel(key, payload) ?? '';
      return {
        key,
        filterLabel: FILTER_LABEL[key],
        originalValueLabel: orig,
        relaxedValueLabel: step.kind === 'widen' ? step.relaxedValueLabel : undefined,
        kind: step.kind,
        urlKeys: urlKeysFor(key),
      };
    });
    return { packages: w.packages, relaxedFilters: relaxed, effectivePayload: w.effectivePayload };
  }

  return { packages: [], relaxedFilters: [], effectivePayload: payload };
}

/**
 * Fetch packages, then if the first page is empty, find the MINIMAL
 * relaxation that yields results. Each relaxable filter has a ladder of
 * progressively looser values (e.g. Makkah hotel: 250m → 500m → 1km → 2km
 * → any). The search picks at most one ladder step per filter and prefers,
 * in order:
 *   1. Fewer filters relaxed.
 *   2. Smaller total widening (earlier ladder steps preserve more intent).
 *   3. More results (when intent-preservation ties).
 *
 * This means if the user asked for "Makkah ≤ 250m" and the matching package
 * is at 300m, we widen to 500m rather than dropping the filter entirely —
 * Booking.com-style "close to your search" behavior.
 *
 * Worst case is bounded by ∏(ladder_i.length + 1) across active filters,
 * but queries within each subset-size level run in parallel and the common
 * case resolves at k=1.
 */
export async function fetchPackagesWithRelaxation(args: {
  payload: PackagesFilterPayload;
  pageSize: number;
  sort: SortValue;
  // Skip relaxation entirely (e.g. user clicked "show only exact matches").
  skipRelaxation?: boolean;
}): Promise<RelaxedFetchResult> {
  const { pageSize, sort, skipRelaxation } = args;

  // Resolve legacy `?location=name` URLs into structured city slugs before
  // anything else runs. Pagination + relaxation all hang off this single
  // resolved payload so we never re-resolve mid-flight.
  const payload = await resolvePackagesPayload(args.payload);

  const initial = await fetchPackages({ payload, page: 0, pageSize, sort });
  if (initial.length > 0 || skipRelaxation) {
    return { packages: initial, relaxedFilters: [], effectivePayload: payload };
  }

  return runRelaxationCascade(payload, pageSize, sort);
}

/**
 * Pure relaxation: run the ladder cascade against an already-resolved
 * payload, assuming the caller already determined that exact match is
 * empty. Returns an empty `packages` array if no relaxation rung yields
 * results.
 *
 * Pairs with fetchPackagesExact: the client renders exact results first,
 * then lazily calls this in the background and swaps in the relaxed
 * result if exact was empty.
 */
export async function fetchPackagesRelaxedOnly(args: {
  payload: PackagesFilterPayload;
  pageSize: number;
  sort: SortValue;
}): Promise<RelaxedFetchResult> {
  const { pageSize, sort } = args;
  const payload = await resolvePackagesPayload(args.payload);
  return runRelaxationCascade(payload, pageSize, sort);
}
