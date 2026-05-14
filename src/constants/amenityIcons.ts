// Curated icon set for package inclusions/amenities. The agent picks one of
// these in the Add Package wizard's Amenities step; the stored value is the
// full Line Awesome class name so AmenitiesSection can render it directly.
//
// `className` must be a valid Line Awesome 1.3.0 class (verified against
// src/fonts/line-awesome-1.3.0/css/line-awesome.css).
export const AMENITY_ICON_OPTIONS: { id: string; label: string; className: string }[] = [
  { id: 'visa', label: 'Visa', className: 'las la-passport' },
  { id: 'flight', label: 'Flight', className: 'las la-plane' },
  { id: 'hotel', label: 'Hotel', className: 'las la-hotel' },
  { id: 'room', label: 'Room / stay', className: 'las la-bed' },
  { id: 'bus', label: 'Bus / coach', className: 'las la-bus' },
  { id: 'car', label: 'Car', className: 'las la-car' },
  { id: 'transport', label: 'Transport / transfer', className: 'las la-shuttle-van' },
  { id: 'clock', label: '24/7 support', className: 'las la-clock' },
  { id: 'paperwork', label: 'Paperwork', className: 'las la-file-signature' },
  { id: 'documents', label: 'Documents', className: 'las la-file-alt' },
  { id: 'meals', label: 'Meals', className: 'las la-utensils' },
  { id: 'support', label: 'Support / helpline', className: 'las la-headset' },
  { id: 'guide', label: "Guide / mu'allim", className: 'las la-hands-helping' },
  { id: 'kaaba', label: 'Kaaba', className: 'las la-kaaba' },
  { id: 'mosque', label: 'Mosque', className: 'las la-mosque' },
  { id: 'location', label: 'Ziyarat / location', className: 'las la-map-marker-alt' },
  { id: 'walking', label: 'Tawaf / walk', className: 'las la-walking' },
  { id: 'prayer', label: 'Prayer', className: 'las la-praying-hands' },
  { id: 'luggage', label: 'Luggage', className: 'las la-suitcase-rolling' },
  { id: 'wifi', label: 'Wi-Fi', className: 'las la-wifi' },
  { id: 'id-card', label: 'ID / processing', className: 'las la-id-card' },
  { id: 'dates', label: 'Dates', className: 'las la-calendar-alt' },
  { id: 'laundry', label: 'Laundry', className: 'las la-tshirt' },
  { id: 'train', label: 'Train', className: 'las la-train' },
  { id: 'price', label: 'Price / budget', className: 'las la-money-bill-wave' },
  { id: 'included', label: 'Included', className: 'las la-check' },
];

// Default selection for the wizard's icon picker.
export const DEFAULT_AMENITY_ICON = AMENITY_ICON_OPTIONS[0].className;

const VALID_AMENITY_ICONS = new Set(AMENITY_ICON_OPTIONS.map((o) => o.className));

// Normalize a stored icon value to a renderable Line Awesome class. Falls back
// to a generic check for legacy/empty values so a row never renders blank.
export const amenityIconClass = (raw?: string | null): string => {
  const value = (raw || '').trim();
  if (VALID_AMENITY_ICONS.has(value)) return value;
  return 'las la-check';
};
