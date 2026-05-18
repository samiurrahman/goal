// Curated list of Indian cities that get a dedicated SEO landing page at
// /umrah-packages-from-[urlSlug]. Each entry maps a clean public URL to the
// underlying `cities.slug` used by the listings query — keeping URLs short
// and stable while letting the DB slug change format without breaking SEO.
//
// dbCitySlug follows the cities-table convention `<city>-<country>-<admin1>`
// where admin1 is the GeoNames numeric admin1 code (see scripts/seed-cities.ts).
// For India that's a 2-digit number (Maharashtra="16", Kerala="13", etc.) —
// NOT the ISO 3166-2 alpha state code. Verify with:
//   pnpm tsx scripts/discover-seo-city-slugs.ts
// An unknown slug renders an empty result set on its landing page and zero
// counts on the homepage city grid.

export type SeoCity = {
  urlSlug: string;
  dbCitySlug: string;
  name: string;
  state: string;
  airportCode?: string;
};

export const SEO_CITIES: SeoCity[] = [
  { urlSlug: 'mumbai', dbCitySlug: 'mumbai-in-16', name: 'Mumbai', state: 'Maharashtra', airportCode: 'BOM' },
  { urlSlug: 'delhi', dbCitySlug: 'delhi-in-07', name: 'Delhi', state: 'Delhi', airportCode: 'DEL' },
  { urlSlug: 'hyderabad', dbCitySlug: 'hyderabad-in-40', name: 'Hyderabad', state: 'Telangana', airportCode: 'HYD' },
  { urlSlug: 'bangalore', dbCitySlug: 'bengaluru-in-19', name: 'Bangalore', state: 'Karnataka', airportCode: 'BLR' },
  { urlSlug: 'chennai', dbCitySlug: 'chennai-in-25', name: 'Chennai', state: 'Tamil Nadu', airportCode: 'MAA' },
  { urlSlug: 'kolkata', dbCitySlug: 'kolkata-in-28', name: 'Kolkata', state: 'West Bengal', airportCode: 'CCU' },
  { urlSlug: 'pune', dbCitySlug: 'pune-in-16', name: 'Pune', state: 'Maharashtra', airportCode: 'PNQ' },
  { urlSlug: 'ahmedabad', dbCitySlug: 'ahmedabad-in-09', name: 'Ahmedabad', state: 'Gujarat', airportCode: 'AMD' },
  { urlSlug: 'lucknow', dbCitySlug: 'lucknow-in-36', name: 'Lucknow', state: 'Uttar Pradesh', airportCode: 'LKO' },
  { urlSlug: 'jaipur', dbCitySlug: 'jaipur-in-24', name: 'Jaipur', state: 'Rajasthan', airportCode: 'JAI' },
  { urlSlug: 'kochi', dbCitySlug: 'kochi-in-13', name: 'Kochi', state: 'Kerala', airportCode: 'COK' },
  { urlSlug: 'calicut', dbCitySlug: 'kozhikode-in-13', name: 'Calicut', state: 'Kerala', airportCode: 'CCJ' },
  { urlSlug: 'thiruvananthapuram', dbCitySlug: 'thiruvananthapuram-in-13', name: 'Thiruvananthapuram', state: 'Kerala', airportCode: 'TRV' },
  { urlSlug: 'mangalore', dbCitySlug: 'mangaluru-in-19', name: 'Mangalore', state: 'Karnataka', airportCode: 'IXE' },
  { urlSlug: 'srinagar', dbCitySlug: 'srinagar-in-12', name: 'Srinagar', state: 'Jammu and Kashmir', airportCode: 'SXR' },
  { urlSlug: 'patna', dbCitySlug: 'patna-in-34', name: 'Patna', state: 'Bihar', airportCode: 'PAT' },
  { urlSlug: 'bhopal', dbCitySlug: 'bhopal-in-35', name: 'Bhopal', state: 'Madhya Pradesh', airportCode: 'BHO' },
  { urlSlug: 'nagpur', dbCitySlug: 'nagpur-in-16', name: 'Nagpur', state: 'Maharashtra', airportCode: 'NAG' },
  { urlSlug: 'aurangabad', dbCitySlug: 'aurangabad-in-16', name: 'Aurangabad', state: 'Maharashtra', airportCode: 'IXU' },
  { urlSlug: 'indore', dbCitySlug: 'indore-in-35', name: 'Indore', state: 'Madhya Pradesh', airportCode: 'IDR' },
  { urlSlug: 'chandigarh', dbCitySlug: 'chandigarh-in-05', name: 'Chandigarh', state: 'Chandigarh', airportCode: 'IXC' },
  { urlSlug: 'guwahati', dbCitySlug: 'guwahati-in-03', name: 'Guwahati', state: 'Assam', airportCode: 'GAU' },
  { urlSlug: 'vijayawada', dbCitySlug: 'vijayawada-in-02', name: 'Vijayawada', state: 'Andhra Pradesh', airportCode: 'VGA' },
  { urlSlug: 'visakhapatnam', dbCitySlug: 'visakhapatnam-in-02', name: 'Visakhapatnam', state: 'Andhra Pradesh', airportCode: 'VTZ' },
  { urlSlug: 'coimbatore', dbCitySlug: 'coimbatore-in-25', name: 'Coimbatore', state: 'Tamil Nadu', airportCode: 'CJB' },
];

export const SEO_CITY_BY_URL_SLUG: Map<string, SeoCity> = new Map(
  SEO_CITIES.map((c) => [c.urlSlug, c])
);

export function getSeoCity(urlSlug: string | undefined | null): SeoCity | undefined {
  if (!urlSlug || typeof urlSlug !== 'string') return undefined;
  return SEO_CITY_BY_URL_SLUG.get(urlSlug.toLowerCase());
}

// Pick N "related" cities for the bottom-of-page internal-linking block.
// Same-state first (boosts topical clustering for Google), then fills with
// the next-highest priority cities. Excludes the current city.
export function getRelatedCities(currentSlug: string, n = 8): SeoCity[] {
  const current = getSeoCity(currentSlug);
  if (!current) return SEO_CITIES.slice(0, n);
  const sameState = SEO_CITIES.filter(
    (c) => c.urlSlug !== currentSlug && c.state === current.state
  );
  const otherState = SEO_CITIES.filter(
    (c) => c.urlSlug !== currentSlug && c.state !== current.state
  );
  return [...sameState, ...otherState].slice(0, n);
}
