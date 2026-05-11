import { supabase } from '@/utils/supabaseClient';
import { Package } from '@/data/types';

export type SortValue = '' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

export type PackagesFilterPayload = {
  location?: string[];
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

const toNum = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

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

  let query = supabase
    .from('packages')
    .select(PACKAGE_FIELDS)
    .eq('published', true)
    .gte('departure_date', todayStr);

  if (payload.location?.length) {
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
  if (error) throw error;

  return (data ?? []) as unknown as Package[];
}
