export type HotelAmenityKey = 'wifi' | 'buffet' | 'laundry';

export interface HotelAmenityOption {
  key: HotelAmenityKey;
  label: string;
  icon: string;
}

export const HOTEL_AMENITY_OPTIONS: HotelAmenityOption[] = [
  { key: 'wifi', label: 'Free wifi', icon: 'la-wifi' },
  { key: 'buffet', label: 'Buffet meals', icon: 'la-utensils' },
  { key: 'laundry', label: 'Laundry', icon: 'la-tshirt' },
];

const KEY_BY_VALUE = new Map(HOTEL_AMENITY_OPTIONS.map((o) => [o.key, o]));

export const getHotelAmenityOption = (key: string): HotelAmenityOption | null =>
  KEY_BY_VALUE.get(key as HotelAmenityKey) || null;

export const sanitizeHotelAmenities = (raw: unknown): HotelAmenityKey[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<HotelAmenityKey>();
  for (const item of raw) {
    const value = String(item || '').trim().toLowerCase();
    if (KEY_BY_VALUE.has(value as HotelAmenityKey)) {
      seen.add(value as HotelAmenityKey);
    }
  }
  return HOTEL_AMENITY_OPTIONS.map((o) => o.key).filter((k) => seen.has(k));
};

export const sanitizeHotelStars = (raw: unknown): number | null => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
};
