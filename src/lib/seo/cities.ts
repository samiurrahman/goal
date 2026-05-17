// Curated list of Indian cities that get a dedicated SEO landing page at
// /umrah-packages-from-[urlSlug]. Each entry maps a clean public URL to the
// underlying `cities.slug` used by the listings query — keeping URLs short
// and stable while letting the DB slug change format without breaking SEO.
//
// dbCitySlug follows the cities-table convention `<city>-in-<state>` (see
// 20260512_cities_postgis.sql). When adding a city, verify the slug exists
// in the cities table; an unknown slug will simply render an empty result
// set on its landing page.

export type SeoCity = {
  urlSlug: string;
  dbCitySlug: string;
  name: string;
  state: string;
  airportCode?: string;
};

export const SEO_CITIES: SeoCity[] = [
  { urlSlug: 'mumbai', dbCitySlug: 'mumbai-in-mh', name: 'Mumbai', state: 'Maharashtra', airportCode: 'BOM' },
  { urlSlug: 'delhi', dbCitySlug: 'new-delhi-in-dl', name: 'Delhi', state: 'Delhi', airportCode: 'DEL' },
  { urlSlug: 'hyderabad', dbCitySlug: 'hyderabad-in-tg', name: 'Hyderabad', state: 'Telangana', airportCode: 'HYD' },
  { urlSlug: 'bangalore', dbCitySlug: 'bengaluru-in-ka', name: 'Bangalore', state: 'Karnataka', airportCode: 'BLR' },
  { urlSlug: 'chennai', dbCitySlug: 'chennai-in-tn', name: 'Chennai', state: 'Tamil Nadu', airportCode: 'MAA' },
  { urlSlug: 'kolkata', dbCitySlug: 'kolkata-in-wb', name: 'Kolkata', state: 'West Bengal', airportCode: 'CCU' },
  { urlSlug: 'pune', dbCitySlug: 'pune-in-mh', name: 'Pune', state: 'Maharashtra', airportCode: 'PNQ' },
  { urlSlug: 'ahmedabad', dbCitySlug: 'ahmedabad-in-gj', name: 'Ahmedabad', state: 'Gujarat', airportCode: 'AMD' },
  { urlSlug: 'lucknow', dbCitySlug: 'lucknow-in-up', name: 'Lucknow', state: 'Uttar Pradesh', airportCode: 'LKO' },
  { urlSlug: 'jaipur', dbCitySlug: 'jaipur-in-rj', name: 'Jaipur', state: 'Rajasthan', airportCode: 'JAI' },
  { urlSlug: 'kochi', dbCitySlug: 'kochi-in-kl', name: 'Kochi', state: 'Kerala', airportCode: 'COK' },
  { urlSlug: 'calicut', dbCitySlug: 'kozhikode-in-kl', name: 'Calicut', state: 'Kerala', airportCode: 'CCJ' },
  { urlSlug: 'thiruvananthapuram', dbCitySlug: 'thiruvananthapuram-in-kl', name: 'Thiruvananthapuram', state: 'Kerala', airportCode: 'TRV' },
  { urlSlug: 'mangalore', dbCitySlug: 'mangaluru-in-ka', name: 'Mangalore', state: 'Karnataka', airportCode: 'IXE' },
  { urlSlug: 'srinagar', dbCitySlug: 'srinagar-in-jk', name: 'Srinagar', state: 'Jammu and Kashmir', airportCode: 'SXR' },
  { urlSlug: 'patna', dbCitySlug: 'patna-in-br', name: 'Patna', state: 'Bihar', airportCode: 'PAT' },
  { urlSlug: 'bhopal', dbCitySlug: 'bhopal-in-mp', name: 'Bhopal', state: 'Madhya Pradesh', airportCode: 'BHO' },
  { urlSlug: 'nagpur', dbCitySlug: 'nagpur-in-mh', name: 'Nagpur', state: 'Maharashtra', airportCode: 'NAG' },
  { urlSlug: 'aurangabad', dbCitySlug: 'aurangabad-in-mh', name: 'Aurangabad', state: 'Maharashtra', airportCode: 'IXU' },
  { urlSlug: 'indore', dbCitySlug: 'indore-in-mp', name: 'Indore', state: 'Madhya Pradesh', airportCode: 'IDR' },
  { urlSlug: 'chandigarh', dbCitySlug: 'chandigarh-in-ch', name: 'Chandigarh', state: 'Chandigarh', airportCode: 'IXC' },
  { urlSlug: 'guwahati', dbCitySlug: 'guwahati-in-as', name: 'Guwahati', state: 'Assam', airportCode: 'GAU' },
  { urlSlug: 'vijayawada', dbCitySlug: 'vijayawada-in-ap', name: 'Vijayawada', state: 'Andhra Pradesh', airportCode: 'VGA' },
  { urlSlug: 'visakhapatnam', dbCitySlug: 'visakhapatnam-in-ap', name: 'Visakhapatnam', state: 'Andhra Pradesh', airportCode: 'VTZ' },
  { urlSlug: 'coimbatore', dbCitySlug: 'coimbatore-in-tn', name: 'Coimbatore', state: 'Tamil Nadu', airportCode: 'CJB' },
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
