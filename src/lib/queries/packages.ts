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

const PACKAGE_FIELDS = [
  'id',
  'slug',
  'title',
  'agent_name',
  'thumbnail_url',
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
  'agent_rating_avg',
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

  let query = supabase.from('packages').select(PACKAGE_FIELDS).eq('published', true);

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
