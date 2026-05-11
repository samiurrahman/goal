// City -> landmark image mapping for the mobile homepage.
// Drop landmark images into /public/images/cities/<filename>.
// Keys are case-insensitive matches against the city name returned from the
// `packages.package_location` field.

export const DEFAULT_CITY_IMAGE = '/images/cities/default.jpg';

export const CITY_LANDMARKS: Record<string, string> = {
  Mumbai: '/images/cities/mumbai.jpg',
  Delhi: '/images/cities/delhi.jpg',
  Bangalore: '/images/cities/bangalore.jpg',
  Hyderabad: '/images/cities/hyderabad.webp',
  Chennai: '/images/cities/chennai.jpg',
  Kolkata: '/images/cities/kolkata.jpg',
  Lucknow: '/images/cities/lucknow.jpg',
  Ahmedabad: '/images/cities/ahmedabad.jpg',
  Pune: '/images/cities/pune.jpg',
  Kochi: '/images/cities/kochi.jpg',
  Nagpur: '/images/cities/nagpur.jpg',
};

export function getCityImage(cityName: string): string {
  if (!cityName) return DEFAULT_CITY_IMAGE;
  const exact = CITY_LANDMARKS[cityName];
  if (exact) return exact;
  const lower = cityName.toLowerCase();
  const key = Object.keys(CITY_LANDMARKS).find((k) => k.toLowerCase() === lower);
  return key ? CITY_LANDMARKS[key] : DEFAULT_CITY_IMAGE;
}
