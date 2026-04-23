import __stayTaxonomies from './jsons/__stayTaxonomies.json';
import __experiencesTaxonomies from './jsons/__experiencesTaxonomies.json';
import { TaxonomyType } from './types';
import { Route } from '@/routers/types';

//

const DEMO_STAY_CATEGORIES: TaxonomyType[] = __stayTaxonomies.map((item) => ({
  ...item,
  taxonomy: 'category',
  listingType: 'stay',
  href: item.href as Route,
}));
//
const DEMO_EXPERIENCES_CATEGORIES: TaxonomyType[] = __experiencesTaxonomies.map((item) => ({
  ...item,
  taxonomy: 'category',
  listingType: 'experiences',
  href: item.href as Route,
}));

export { DEMO_STAY_CATEGORIES, DEMO_EXPERIENCES_CATEGORIES };
