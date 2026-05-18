// Curated facet landing pages — programmatic SEO for non-city query intent
// (budget, duration, season, hotel distance). Each entry maps a clean URL to
// the underlying packages query and carries enough hand-written copy that
// Google sees the page as substantive content, not a near-duplicate of /packages.
//
// When adding a facet:
//   1. Pick a category so it shows up in the right related-facets block.
//   2. Write a real intro + FAQs — duplicate-ish copy across facets is the
//      single fastest way to get the whole cluster de-indexed.
//   3. Verify the payload actually matches packages in dev; an empty facet
//      page is worse than no facet page at all (it'll soft-fallback to
//      nationwide top-rated, which is fine but dilutes the SEO signal).

import type { PackagesFilterPayload } from '@/lib/queries/packages';

export type FacetCategory = 'budget' | 'duration' | 'season' | 'distance' | 'feature';

export type SeoFacet = {
  urlSlug: string;
  category: FacetCategory;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  introLede: string;
  bodyParagraphs: string[];
  payload: PackagesFilterPayload;
  // Stable list of {label, value} for the right-rail "Quick facts" card.
  // Each entry must hold without any DB lookup so the SSR is cheap.
  quickFacts: { label: string; value: string }[];
  faqs: { question: string; answer: string }[];
  // Headline shown in related-facet cards across the site.
  relatedCardTitle: string;
};

// ---------- BUDGET ----------
const budgetFacets: SeoFacet[] = [
  {
    urlSlug: 'cheap-umrah-packages',
    category: 'budget',
    h1: 'Cheap Umrah Packages Under ₹90,000',
    metaTitle: 'Cheap Umrah Packages Under ₹90,000 | Searchumrah',
    metaDescription:
      'Compare verified cheap Umrah packages under ₹90,000 per person. Real reviews, transparent pricing, hotels in Makkah & Madinah. Book direct with KYC-verified agents.',
    introLede: 'Affordable Umrah, without the corner-cutting that usually comes with rock-bottom pricing.',
    bodyParagraphs: [
      'The cheapest Umrah packages tend to fall in one of three buckets: shorter trips (7-9 days), off-peak departure dates (avoiding Ramadan and school holidays), or hotels further from the Haram. None of these are inherently bad — they just trade one thing for another. The packages below are filtered to ₹90,000 or less per person; the agent listing tells you exactly which trade-off each one is making.',
      'A truly cheap Umrah package should still include the Saudi visa, return flights from your departure city, accommodation in both Makkah and Madinah, and airport transfers. If any of those four are missing or extra-cost, the headline price is misleading — check the inclusions section on each package detail page before contacting the agent.',
      'Every agent on Searchumrah is KYC-verified, and we don\'t take payment ourselves. You browse, compare, contact the agent directly, and pay them — exactly as you would offline, just with verification and reviews built in.',
    ],
    payload: { priceRange: [0, 90000] },
    quickFacts: [
      { label: 'Price ceiling', value: '₹90,000 / person' },
      { label: 'Typical duration', value: '7 – 12 days' },
      { label: 'Best season', value: 'Off-peak (May, Sep)' },
      { label: 'Usually omits', value: 'Premium hotels' },
    ],
    faqs: [
      {
        question: 'What makes an Umrah package "cheap"?',
        answer:
          'Cheap Umrah packages are usually built around one of three savings: shorter total duration (7–9 days vs the typical 14), off-peak travel windows (avoiding Ramadan, Eid, and school holidays), or hotels further from the Haram. They\'re only "cheap" relative to peak-season premium packages — the inclusions should still cover visa, return flights, accommodation, and transfers.',
      },
      {
        question: 'Are cheap Umrah packages safe and reliable?',
        answer:
          'Yes, if the agent is verified. Searchumrah only lists KYC-verified travel agents, so a low price doesn\'t mean an unverified operator. The most common pitfall isn\'t safety — it\'s hidden extras (visa fees billed separately, breakfast not included, transfers charged at the airport). Always check the inclusions section before booking.',
      },
      {
        question: 'What\'s typically cut from a cheap Umrah package?',
        answer:
          'In order of frequency: hotel distance from the Haram (you\'ll walk 1–2 km instead of 200m), hotel star rating (3-star instead of 4-5), sharing room configuration (5-person sharing instead of double), and meals (breakfast-only instead of half-board). Flights and visa are almost always still included — those are the regulated parts of an Umrah package.',
      },
      {
        question: 'Are visa fees included in cheap Umrah packages?',
        answer:
          'On Searchumrah, packages display the Saudi visa as a clear "included" or "not included" badge. Most listed cheap packages do include the visa — agents bundle it because it\'s easier than coordinating an external visa application. If a package excludes visa, expect an additional ₹15,000–₹25,000 cost depending on processing speed.',
      },
      {
        question: 'When is the best time to find cheap Umrah deals?',
        answer:
          'Off-peak windows: May, June, September, and the second half of January. Avoid Ramadan (highest prices), Eid windows, and Indian school summer/winter holidays. Booking 90+ days ahead also typically saves 10–20%. The flip side: peak weather (June–August) is genuinely hard in Makkah — savings come with real physical trade-offs.',
      },
      {
        question: 'How do I compare cheap Umrah packages fairly?',
        answer:
          'Use the filter pills on /packages to lock down duration, hotel distance, and sharing configuration BEFORE looking at prices. Otherwise, you end up comparing a 7-day, 5-person sharing, 2km-from-Haram package to a 14-day, double-sharing, 300m package — the cheaper one looks better on price but is a completely different product.',
      },
    ],
    relatedCardTitle: 'Cheap Umrah packages',
  },
  {
    urlSlug: 'budget-umrah-packages',
    category: 'budget',
    h1: 'Budget Umrah Packages Under ₹1,20,000',
    metaTitle: 'Budget Umrah Packages Under ₹1.2 Lakh | Searchumrah',
    metaDescription:
      'Compare budget Umrah packages priced under ₹1,20,000. Verified agents, comfortable mid-range hotels, full inclusions. Find the sweet spot between cost and comfort.',
    introLede: 'The sweet spot between rock-bottom cheap and premium comfort.',
    bodyParagraphs: [
      'Budget Umrah packages sit in the ₹90,000 – ₹1,20,000 band — typically 10-14 days, with mid-range hotels (3-4 star), reasonable hotel distance from the Haram (500m – 1.5km), and the standard inclusions (visa, return flights, breakfast, transfers).',
      'This price band is where most first-time pilgrims land. It avoids the corners that genuinely cheap packages cut (long walks to the Haram, very basic hotels), without paying the 4x premium of luxury packages for marginal upgrades.',
      'Use the filters on each package page to lock down the things that matter to you — hotel distance is usually the single biggest comfort factor, especially for elderly pilgrims.',
    ],
    payload: { priceRange: [0, 120000] },
    quickFacts: [
      { label: 'Price ceiling', value: '₹1,20,000 / person' },
      { label: 'Typical duration', value: '10 – 14 days' },
      { label: 'Hotel range', value: '500m – 1.5km from Haram' },
      { label: 'Stars', value: '3 – 4 star' },
    ],
    faqs: [
      {
        question: 'What\'s the difference between cheap and budget Umrah packages?',
        answer:
          'Cheap (under ₹90K) typically means shorter trips, hotels further from the Haram, or higher-density sharing. Budget (under ₹1.2L) lets you keep a 12-14 day trip with closer hotels and double or triple sharing — meaningfully more comfortable for the same kind of inclusions.',
      },
      {
        question: 'Is a budget Umrah package enough for first-time pilgrims?',
        answer:
          'Yes — most first-time pilgrims book in this range. The key things first-timers value (a closer Makkah hotel, breakfast included, airport transfers, a duration that lets you actually rest between rituals) are all standard at this price point.',
      },
      {
        question: 'Are all inclusions standard at this price?',
        answer:
          'Visa, return flights, hotel accommodation, and airport transfers are standard. Breakfast is included in roughly 90% of packages in this range. Lunch/dinner is usually extra. Zamzam water (5L allowance) is often included. Always confirm specifics on the package detail page.',
      },
      {
        question: 'What about hotel quality?',
        answer:
          'Expect 3-star international standard or 4-star regional — clean, simple rooms, en-suite bathrooms, lift access, breakfast buffet. Not luxury, but completely fine for the purpose. The Haram itself is the focal point; pilgrims spend most waking hours there, not in the room.',
      },
    ],
    relatedCardTitle: 'Budget Umrah packages',
  },
  {
    urlSlug: 'luxury-umrah-packages',
    category: 'budget',
    h1: 'Luxury Umrah Packages from ₹2,00,000',
    metaTitle: 'Luxury Umrah Packages — 5-Star Hotels Near Haram | Searchumrah',
    metaDescription:
      'Premium Umrah packages from ₹2,00,000. 5-star hotels within walking distance of the Haram and Masjid an-Nabawi. Verified agents, comprehensive inclusions.',
    introLede: '5-star hotels within walking distance of the Haram, full inclusions, premium service.',
    bodyParagraphs: [
      'Luxury Umrah packages typically run ₹2,00,000 and up per person. The premium buys you three things: hotels under 300m from the Haram (often the Hilton, Conrad, Pullman Zamzam, Fairmont clock tower, or Anjum), 5-star service standards, and small group sizes (double or triple sharing instead of 4-5 person).',
      'These packages also typically include things that are extras at the budget level: full board meals, premium flights (direct or single layover), guided Ziyarat tours, and 24/7 in-Makkah support staff.',
      'For elderly pilgrims, family groups with young children, or anyone for whom physical mobility is a concern, the closer-hotel premium usually justifies itself within the first day.',
    ],
    payload: { priceRange: [200000, Number.POSITIVE_INFINITY] },
    quickFacts: [
      { label: 'Price floor', value: '₹2,00,000 / person' },
      { label: 'Hotel distance', value: '< 300m from Haram' },
      { label: 'Hotel category', value: '5-star international' },
      { label: 'Meals', value: 'Full board typical' },
    ],
    faqs: [
      {
        question: 'What exactly does a luxury Umrah package include?',
        answer:
          'Beyond the standard (visa, return flights, accommodation, transfers): 5-star hotel rooms within 300m of the Haram, full board meals (breakfast + lunch + dinner buffet), small group sizes (double or triple sharing), priority airport handling, and typically a dedicated in-country coordinator. Many packages also include guided Ziyarat tours and Zamzam water shipping.',
      },
      {
        question: 'Which hotels are typical in luxury Umrah packages?',
        answer:
          'In Makkah: Fairmont Makkah Clock Royal Tower, Pullman Zamzam, Hilton Suites, Conrad, Anjum, Swissôtel Al Maqam. In Madinah: Anwar Al Madinah Mövenpick, Pullman Zamzam Madinah, Madinah Hilton, Crowne Plaza. All are within 5-minute walks of their respective masjids.',
      },
      {
        question: 'Is the premium worth it?',
        answer:
          'For pilgrims who value physical comfort (elderly, mobility-limited, traveling with young children) — yes, almost always. Walking 5 minutes to the Haram instead of 30 minutes saves hours per day and reduces fatigue significantly. For young, mobile, single travelers — the budget tier usually delivers the same spiritual experience for half the price.',
      },
      {
        question: 'Are luxury Umrah packages refundable?',
        answer:
          'Cancellation policies vary by agent and how close to departure you cancel. Premium packages typically have more lenient cancellation than budget ones (since margins are larger), but always read the cancellation policy on each package detail page or ask the agent before paying any deposit.',
      },
    ],
    relatedCardTitle: 'Luxury Umrah packages',
  },
];

// ---------- DURATION ----------
const durationFacets: SeoFacet[] = [
  {
    urlSlug: '7-day-umrah-package',
    category: 'duration',
    h1: '7-Day Umrah Packages',
    metaTitle: '7-Day Umrah Packages — Short Trip Options | Searchumrah',
    metaDescription:
      'Compare 7-day Umrah packages from verified Indian agents. Ideal for short leave windows. Hotel options, inclusions, prices — book direct.',
    introLede: 'The shortest viable Umrah window — for tight leave schedules.',
    bodyParagraphs: [
      'A 7-day Umrah package is the shortest most agents will offer. Typical split: 4 nights in Makkah, 2 nights in Madinah, with a single travel day. It works best for repeat pilgrims who know the rituals, or for working professionals with limited leave.',
      'First-time pilgrims often find 7 days rushed — performing Umrah on arrival day after a long flight, then immediately preparing for departure puts the spiritual focus under time pressure. If 7 days is what fits, that\'s fine — but consider whether 10 days might be a meaningfully better experience for marginally more cost.',
      'Prices for 7-day packages typically run 20-30% less than the equivalent 14-day package, because flights are the largest fixed cost and accommodation nights are the biggest variable.',
    ],
    payload: { durationRange: [7, 8] },
    quickFacts: [
      { label: 'Duration', value: '7 days / 6 nights' },
      { label: 'Makkah split', value: '~ 4 nights' },
      { label: 'Madinah split', value: '~ 2 nights' },
      { label: 'Best for', value: 'Repeat pilgrims, short leave' },
    ],
    faqs: [
      {
        question: 'Is 7 days enough time for Umrah?',
        answer:
          'Mechanically yes — Umrah itself is a few hours of rituals (Ihram, Tawaf, Sa\'i, halq/taqsir). 7 days gives you the journey, the rituals, time at both holy mosques, and the return. It does NOT give you much margin for jet lag, illness, or contemplative time. Most agents recommend 10 days minimum for first-time pilgrims for that reason.',
      },
      {
        question: 'How is the 7-day Umrah package split between Makkah and Madinah?',
        answer:
          'Typical split is 4 nights Makkah, 2 nights Madinah, with travel days at start and end. Some agents flip this depending on flight routing — arriving via Madinah (MED) usually means starting in Madinah and finishing in Makkah; arriving via Jeddah (JED) typically goes the other way.',
      },
      {
        question: 'Are 7-day Umrah packages cheaper than 14-day?',
        answer:
          'Yes — usually 20-30% less, because hotel costs scale with nights and most other costs (flights, visa, transfers) are fixed. A ₹1,20,000 14-day package might be ₹90,000 for 7 days from the same agent.',
      },
      {
        question: 'What\'s the typical 7-day Umrah itinerary?',
        answer:
          'Day 1: arrive Jeddah or Madinah, transfer to first city. Day 2-4: rituals + worship at first holy mosque. Day 5: travel between Makkah and Madinah (4-hour drive). Day 6: worship at second holy mosque. Day 7: depart. Tight, but workable for an experienced pilgrim.',
      },
    ],
    relatedCardTitle: '7-day Umrah packages',
  },
  {
    urlSlug: '10-day-umrah-package',
    category: 'duration',
    h1: '10-Day Umrah Packages',
    metaTitle: '10-Day Umrah Packages — Most Popular Duration | Searchumrah',
    metaDescription:
      'Compare 10-day Umrah packages from verified agents. The most popular Umrah duration — balanced time in both Makkah & Madinah, comfortable pace.',
    introLede: 'The most-booked Umrah duration. Comfortable pace, balanced split between the two holy cities.',
    bodyParagraphs: [
      '10 days is the most commonly chosen Umrah duration in India. Typical split: 5-6 nights in Makkah, 3-4 nights in Madinah, with travel buffer at both ends. The extra days vs a 7-day trip absorb jet lag, give time for repeated Tawaf and Salah in Jamaat at the Haram, and reduce the rushed feeling around ritual performance.',
      'For first-time pilgrims, 10 days is usually the recommended minimum — enough margin for the unexpected (visa delays, illness, transfer hiccups) without becoming a long trip away from work and family.',
      'Pricing typically falls in the ₹95,000 – ₹1,50,000 range per person depending on hotel category, sharing room configuration, and departure city.',
    ],
    payload: { durationRange: [10, 11] },
    quickFacts: [
      { label: 'Duration', value: '10 days / 9 nights' },
      { label: 'Makkah split', value: '~ 5–6 nights' },
      { label: 'Madinah split', value: '~ 3–4 nights' },
      { label: 'Best for', value: 'First-time pilgrims' },
    ],
    faqs: [
      {
        question: 'Why is 10 days the most popular Umrah duration?',
        answer:
          'It balances three things: enough time to perform rituals without rushing and absorb the spiritual experience, manageable cost (each extra night adds ₹3,000-₹8,000), and a leave window most working professionals in India can take. 7 is too tight; 14+ becomes hard to schedule.',
      },
      {
        question: 'How are 10 days split between Makkah and Madinah?',
        answer:
          'Most agents allocate 5-6 nights in Makkah (the primary site of Umrah rituals) and 3-4 nights in Madinah (visiting Masjid an-Nabawi and the Rawdah). Travel between the two cities takes about 4 hours by road. Some packages flip the order based on incoming flight routing.',
      },
      {
        question: 'What does a 10-day Umrah package cost?',
        answer:
          'Typically ₹95,000 – ₹1,50,000 per person from major Indian cities. Budget hotels and off-peak dates push toward the lower end; 5-star hotels under 500m from the Haram and Ramadan/Eid windows push toward the upper. Use the price filter on /packages to see live options.',
      },
      {
        question: 'Can I customize the Makkah/Madinah split on a 10-day package?',
        answer:
          'Many agents accommodate split changes (e.g., 7 Makkah + 3 Madinah or 4 + 6) on private bookings, especially if requested at the inquiry stage. Group package bookings are harder to modify because all pilgrims travel on the same itinerary. Ask the agent directly.',
      },
    ],
    relatedCardTitle: '10-day Umrah packages',
  },
  {
    urlSlug: '14-day-umrah-package',
    category: 'duration',
    h1: '14-Day Umrah Packages',
    metaTitle: '14-Day Umrah Packages — Two-Week Spiritual Journey | Searchumrah',
    metaDescription:
      'Compare 14-day Umrah packages. Unhurried two-week journeys with extended time in both Makkah and Madinah. Verified agents, transparent pricing.',
    introLede: 'A full two-week spiritual journey. Unhurried, with extended time in both holy cities.',
    bodyParagraphs: [
      '14-day Umrah packages give you a genuinely unhurried experience. Typical split: 8-9 nights in Makkah, 5-6 nights in Madinah. The extra days vs. a 10-day trip allow for multiple Umrah performances (a common practice — performing Umrah on behalf of deceased family members), extended Itikaf-style worship at the Haram, and full Ziyarat tours around Madinah.',
      'This duration suits retirees, families on extended vacation, and first-time pilgrims who want to experience the journey without time pressure. The cost premium over a 10-day package is roughly ₹25,000 – ₹50,000 per person depending on hotel category.',
      'Note: many 14-day packages now offer "10 + 4 Madinah" or "11 + 3 Madinah" splits to fit specific airline schedules — verify the exact night split on each package detail page.',
    ],
    payload: { durationRange: [14, 15] },
    quickFacts: [
      { label: 'Duration', value: '14 days / 13 nights' },
      { label: 'Makkah split', value: '~ 8–9 nights' },
      { label: 'Madinah split', value: '~ 5–6 nights' },
      { label: 'Best for', value: 'Retirees, families, multiple Umrahs' },
    ],
    faqs: [
      {
        question: 'Why book a 14-day Umrah package over 10?',
        answer:
          'Three main reasons: time for multiple Umrah performances (each requires re-entering Ihram, often from Tan\'eem masjid), extended worship at the Haram during Itikaf-style retreats, and unhurried family travel with elderly or young pilgrims. The cost premium is typically ₹25K-50K per person.',
      },
      {
        question: 'Is a 14-day Umrah trip too long?',
        answer:
          'Depends on your purpose. For working professionals taking annual leave — yes, usually. For retirees and pilgrims wanting deep spiritual immersion — no. The Haram has an unusual quality of expanding the time you spend there; many pilgrims who book 14 days report feeling like they wanted longer.',
      },
      {
        question: 'How is 14 days typically split between Makkah and Madinah?',
        answer:
          'Standard split: 8-9 nights in Makkah, 5-6 nights in Madinah. Some agents offer 10+3 or 11+2 to fit specific airline routings or to maximize Makkah time. The split is usually listed on each package detail page; confirm with the agent if it matters to your plans.',
      },
      {
        question: 'Are 14-day Umrah packages refundable in case of visa delays?',
        answer:
          'Refund terms vary by agent. Most charge a small deposit at booking (typically 10-20% of total) which is non-refundable, with the balance refundable up to a cutoff date (typically 21-30 days before departure). Visa-delay specific clauses are rare — check the cancellation policy on each package.',
      },
    ],
    relatedCardTitle: '14-day Umrah packages',
  },
  {
    urlSlug: '21-day-umrah-package',
    category: 'duration',
    h1: '21-Day Umrah Packages',
    metaTitle: '21-Day Umrah Packages — Extended Pilgrimage | Searchumrah',
    metaDescription:
      'Compare 21-day extended Umrah packages. Full three-week journey for deep worship, multiple Umrahs, extensive Ziyarat. Verified agents only.',
    introLede: 'Extended three-week journey. Suited to deep worship, multiple Umrahs, and complete Ziyarat.',
    bodyParagraphs: [
      '21-day Umrah packages are the long-format option — typically 12-14 nights in Makkah and 7-8 nights in Madinah. This duration is favored by retirees, scholars on study trips, and pilgrims performing Umrah on behalf of multiple deceased relatives.',
      'The extended time allows for Itikaf, deeper Qur\'an study at the Haram, comprehensive Ziyarat tours (Cave of Hira, Cave of Thawr, battlefield sites around Madinah, the historical heritage of the Hejaz), and a less rushed travel pace.',
      'Cost-wise, expect roughly 50-80% more than a 10-day package — hotel nights scale linearly while flights stay fixed, so the per-day cost actually drops compared to shorter trips.',
    ],
    payload: { durationRange: [21, 22] },
    quickFacts: [
      { label: 'Duration', value: '21 days / 20 nights' },
      { label: 'Makkah split', value: '~ 12–14 nights' },
      { label: 'Madinah split', value: '~ 7–8 nights' },
      { label: 'Best for', value: 'Retirees, extended worship, Ziyarat' },
    ],
    faqs: [
      {
        question: 'Who books 21-day Umrah packages?',
        answer:
          'Mostly retirees with flexible schedules, scholars combining Umrah with study trips, families planning multiple Umrah performances, and pilgrims performing Umrah on behalf of deceased family members. Working professionals rarely book this duration due to leave constraints.',
      },
      {
        question: 'How much does a 21-day Umrah package cost?',
        answer:
          'Typically 50-80% more than the equivalent 10-day package — for example, a ₹1,20,000 10-day package might be ₹1,80,000 – ₹2,15,000 at 21 days. The per-night cost is actually lower (flights amortize across more nights), making 21 days a better value if you can take the time.',
      },
      {
        question: 'What do you do for 21 days in Makkah and Madinah?',
        answer:
          'For devout pilgrims — there\'s no shortage of activity. Daily Salah in Jamaat, Tawaf, Qur\'an recitation at the Haram and Rawdah, Ziyarat to historical sites, Itikaf during the last 10 nights of Ramadan if you\'re traveling then. The spiritual depth that comes from extended time in these places is hard to replicate elsewhere.',
      },
      {
        question: 'Can I leave Makkah/Madinah during a 21-day package?',
        answer:
          'Yes — many extended packages include day trips to Taif (mountains, climate change, Prophet Muhammad\'s sites), Jeddah (Red Sea coast, old city), or Khaybar (battlefield sites). Some agents offer these as add-ons; others bundle them in. Verify with the agent.',
      },
    ],
    relatedCardTitle: '21-day Umrah packages',
  },
];

// ---------- SEASON ----------
//
// Ramadan 2026 (1447 AH) is approximately Feb 17 – Mar 18, 2026.
// Ramadan 2027 (1448 AH) is approximately Feb 6 – Mar 7, 2027.
// (Exact start depends on moon sighting; we use the broader month windows.)
const seasonFacets: SeoFacet[] = [
  {
    urlSlug: 'ramadan-umrah-2026',
    category: 'season',
    h1: 'Ramadan Umrah Packages 2026',
    metaTitle: 'Ramadan Umrah Packages 2026 | Last 10 Nights, Iftar Hotels',
    metaDescription:
      'Book verified Ramadan Umrah packages for 2026 (1447 AH). Iftar at the Haram, last 10 nights options, premium hotels. Compare prices from KYC-verified agents.',
    introLede: 'The most spiritually significant Umrah window of the year.',
    bodyParagraphs: [
      'Ramadan Umrah holds the highest reward in Islamic tradition — the Prophet (ﷺ) said Umrah in Ramadan is equivalent in reward to performing Hajj. The Haram during Ramadan, particularly during the last 10 nights (Laylat al-Qadr), is unlike any other time of year: 2 million+ pilgrims, iftar served collectively across the entire Mataf area, and Salah in Jamaat with one of the largest congregations on Earth.',
      'Ramadan 2026 corresponds to approximately February 17 to March 18, 2026 (1447 AH). Packages for this window are typically 2-3x the price of off-peak Umrah, with premium hotels (within walking distance of the Haram) selling out 9-12 months in advance.',
      'The most-booked sub-window is the last 10 nights (around March 8-18, 2026). Pilgrims wanting the spiritual peak but with marginally lower cost often book the first half of Ramadan instead — still spiritually significant, with much better availability and 30-40% lower pricing.',
    ],
    payload: { months: [2, 3], year: 2026 },
    quickFacts: [
      { label: 'Ramadan 2026', value: 'Feb 17 – Mar 18, 2026 (approx)' },
      { label: 'Hijri year', value: '1447 AH' },
      { label: 'Peak sub-window', value: 'Last 10 nights (~ Mar 8–18)' },
      { label: 'Booking deadline', value: '6–9 months ahead recommended' },
    ],
    faqs: [
      {
        question: 'When is Ramadan in 2026?',
        answer:
          'Ramadan 2026 (1447 AH) is approximately February 17 to March 18, 2026. The exact start depends on moon sighting in Saudi Arabia and may shift by 1-2 days. Eid al-Fitr 1447 falls on approximately March 19-20, 2026.',
      },
      {
        question: 'Why are Ramadan Umrah packages more expensive?',
        answer:
          'Demand. Ramadan attracts the highest density of pilgrims worldwide — 2 million+ in Makkah during the last 10 nights — which pushes hotel rates 2-3x above off-peak. Airline pricing also climbs as the date approaches. Premium hotels near the Haram typically sell out 9-12 months in advance.',
      },
      {
        question: 'Should I book the last 10 nights or the first half of Ramadan?',
        answer:
          'Last 10 nights is the spiritual peak — Laylat al-Qadr falls during this window. But pricing is 30-40% higher than the first half and availability is much tighter. Many pilgrims who can\'t book the last 10 nights instead choose the first half (still fully Ramadan, still spiritually significant) and find it a much better experience than missing the trip entirely.',
      },
      {
        question: 'When should I book a Ramadan 2026 Umrah package?',
        answer:
          'For the last 10 nights with a premium hotel near the Haram — by August or September 2025. For the first half of Ramadan with mid-range hotels — by November 2025 is usually fine. Last-minute Ramadan bookings (1-2 months out) are possible but you\'ll pay 50-100% over standard pricing.',
      },
      {
        question: 'What\'s the typical Ramadan Umrah package length?',
        answer:
          'Most Ramadan packages are 10-14 days. Short 7-day Ramadan packages exist but feel cramped given the depth of spiritual activity. Many agents also offer "last 10 nights only" packages (10-11 days) timed specifically to cover Mar 8 onward.',
      },
      {
        question: 'Is travel during Ramadan difficult?',
        answer:
          'It\'s rewarding but physically demanding. Days are spent fasting; nights at the Haram are crowded and active. Sleep schedule shifts dramatically (taraweeh + suhoor often means sleeping 11 PM – 4 AM and again 9 AM – 1 PM). Elderly pilgrims sometimes find the heat + fasting + crowds too taxing — consider Shawwal (the month after Ramadan) as an alternative.',
      },
    ],
    relatedCardTitle: 'Ramadan Umrah 2026',
  },
  {
    urlSlug: 'ramadan-umrah-2027',
    category: 'season',
    h1: 'Ramadan Umrah Packages 2027',
    metaTitle: 'Ramadan Umrah Packages 2027 | Early Booking, Verified Agents',
    metaDescription:
      'Plan early for Ramadan Umrah 2027 (1448 AH). Approximately Feb 6 – Mar 7, 2027. Premium hotels sell out 12 months ahead. Compare KYC-verified agents.',
    introLede: 'Plan early — Ramadan 2027 premium hotels sell out a year in advance.',
    bodyParagraphs: [
      'Ramadan 2027 (1448 AH) falls approximately February 6 to March 7, 2027. The Hijri lunar year moves Ramadan ~11 days earlier each Gregorian year, so 2027 will be earlier in February than 2026 — meaning slightly cooler temperatures in Makkah and shorter fasting days.',
      'Booking for Ramadan 2027 should start by April-May 2026 for premium hotels near the Haram. Agents start releasing 2027 inventory roughly 14-16 months in advance.',
      'The same dynamics apply as Ramadan 2026 — last 10 nights are most expensive and book first; first half is more accessible and meaningfully cheaper.',
    ],
    payload: { months: [2, 3], year: 2027 },
    quickFacts: [
      { label: 'Ramadan 2027', value: 'Feb 6 – Mar 7, 2027 (approx)' },
      { label: 'Hijri year', value: '1448 AH' },
      { label: 'Peak sub-window', value: 'Last 10 nights (~ Feb 25 – Mar 7)' },
      { label: 'Booking opens', value: '~ April 2026' },
    ],
    faqs: [
      {
        question: 'When does booking open for Ramadan Umrah 2027?',
        answer:
          'Major agents typically open Ramadan 2027 packages in April-May 2026 — roughly 10-11 months ahead. Premium hotels with the closest proximity to the Haram release inventory first; budget options come online closer to the date.',
      },
      {
        question: 'When is Ramadan in 2027?',
        answer:
          'Approximately February 6 to March 7, 2027 (1448 AH). The Islamic calendar is lunar and moves ~11 days earlier each Gregorian year, so 2027 will be a few days earlier in February than 2026 was.',
      },
      {
        question: 'Is Ramadan 2027 going to be hotter or cooler than 2026?',
        answer:
          'Cooler — Ramadan 2027 is in early February vs. mid-late February in 2026. Saudi temperatures in early February typically range 18-25°C daytime, vs. 22-30°C by late February. Fasting days are also slightly shorter in early February (~11h45m vs ~12h15m).',
      },
      {
        question: 'How far in advance should I book Ramadan 2027?',
        answer:
          'For the last 10 nights at premium hotels (Fairmont, Hilton, Conrad) — book by August 2026. For mid-range hotels — November 2026 is fine. Last-minute Ramadan bookings (4-8 weeks out) carry 50-100% price premiums and very limited hotel options.',
      },
    ],
    relatedCardTitle: 'Ramadan Umrah 2027',
  },
  {
    urlSlug: 'december-umrah-packages',
    category: 'season',
    h1: 'December Umrah Packages',
    metaTitle: 'December Umrah Packages — School Holiday & Cool Weather',
    metaDescription:
      'December Umrah packages from verified Indian agents. Comfortable winter weather in Makkah, school holiday timing, family-friendly. Compare and book direct.',
    introLede: 'Cool weather, school-holiday timing, family-friendly. The most popular non-Ramadan window.',
    bodyParagraphs: [
      'December is the most popular non-Ramadan Umrah window for Indian families. Makkah weather is at its most comfortable (18-26°C, low humidity), Indian school holidays align with the second half of the month, and crowds are moderate compared to Ramadan or Eid windows.',
      'The trade-off: December pricing sits between off-peak (May-September) and Ramadan peak, typically 15-30% above off-peak rates. Booking 90+ days ahead usually captures the better deals.',
      'For families with school-age children, December Umrah packages timed around the December 20 – January 5 window are typically the easiest to coordinate.',
    ],
    payload: { months: [12] },
    quickFacts: [
      { label: 'Best window', value: 'Dec 20 – Jan 5 (school holidays)' },
      { label: 'Weather', value: '18 – 26°C, comfortable' },
      { label: 'Crowds', value: 'Moderate' },
      { label: 'Pricing', value: 'Mid-tier, ~15-30% over off-peak' },
    ],
    faqs: [
      {
        question: 'What\'s the weather like for December Umrah?',
        answer:
          'The most comfortable weather of the year in Makkah and Madinah — daytime 18-26°C, nighttime 12-18°C, low humidity, minimal rain. Pilgrims can stay outdoors longer, walk to the Haram comfortably even from hotels further out, and avoid the heat exhaustion risks of summer Umrah.',
      },
      {
        question: 'Is December Umrah good for families with kids?',
        answer:
          'Yes — for three reasons: weather is forgiving for young children and elderly grandparents, Indian school winter holidays (typically Dec 20 – Jan 5) make it easy to take the whole family, and crowds are moderate enough that families don\'t feel overwhelmed in the Haram.',
      },
      {
        question: 'When should I book a December Umrah package?',
        answer:
          'Book by July-August for the school-holiday window (Dec 20 – Jan 5) — that\'s when family demand spikes. Other December dates can usually be booked 60-90 days ahead. Last-minute December bookings (under 30 days) face limited inventory but reasonable pricing.',
      },
      {
        question: 'How does December pricing compare to Ramadan?',
        answer:
          'December is typically 30-50% cheaper than Ramadan, but 15-30% more expensive than true off-peak (May, September). A 10-day Umrah package that costs ₹95,000 in May might be ₹1,15,000 in December and ₹1,75,000 during the last 10 nights of Ramadan.',
      },
    ],
    relatedCardTitle: 'December Umrah',
  },
  {
    urlSlug: 'winter-umrah-packages',
    category: 'season',
    h1: 'Winter Umrah Packages (Nov – Feb)',
    metaTitle: 'Winter Umrah Packages — November to February | Searchumrah',
    metaDescription:
      'Compare winter Umrah packages (November through February). Comfortable weather window, mid-range pricing, family-friendly. Verified agents only.',
    introLede: 'The four-month window when weather makes Umrah genuinely comfortable for everyone.',
    bodyParagraphs: [
      'Winter Umrah covers November through February — the four-month window when Makkah\'s daytime temperatures stay in the 18-28°C range and outdoor activity (Tawaf, walks between Haram and hotel, Ziyarat tours) is comfortable for all ages.',
      'Within winter, December has the most family bookings (school holidays), January is the cheapest sub-window (post-holiday slump), November is a sweet spot for working professionals (Diwali leave + good weather), and February increasingly overlaps with Ramadan in 2026 and 2027.',
      'Winter Umrah pricing typically runs ₹95,000 – ₹1,80,000 per person for the standard 10-14 day packages, with January often the best-value window.',
    ],
    payload: { months: [11, 12, 1, 2] },
    quickFacts: [
      { label: 'Window', value: 'November – February' },
      { label: 'Daytime weather', value: '18 – 28°C' },
      { label: 'Cheapest month', value: 'January (post-holiday)' },
      { label: 'Best for families', value: 'December (school break)' },
    ],
    faqs: [
      {
        question: 'Why is winter the most popular non-Ramadan Umrah window?',
        answer:
          'Weather. Makkah\'s summer (May-September) can hit 45°C+; daytime Tawaf becomes physically punishing, especially for elderly pilgrims. Winter (18-28°C) makes the same rituals comfortable, allows longer time at the Haram, and removes heat-exhaustion risk for vulnerable travelers.',
      },
      {
        question: 'Which winter month is cheapest for Umrah?',
        answer:
          'Typically January — after the December school-holiday rush, before pre-Ramadan booking heats up. November is also a good value if you can travel mid-month (avoiding Diwali). February pricing varies year-to-year depending on how close Ramadan is.',
      },
      {
        question: 'Do I need warm clothes for winter Umrah?',
        answer:
          'Light layers. Daytime temperatures are warm enough for short-sleeve shirts and standard Umrah attire; evenings can drop to 10-15°C so a light jacket or sweater is useful — especially in Madinah which runs slightly cooler than Makkah. Inside the Haram is climate-controlled.',
      },
      {
        question: 'Is rain a concern during winter Umrah?',
        answer:
          'Rarely. Makkah averages 5-10mm of rainfall in winter months total. Madinah is slightly higher but still minimal. Flash flooding has occurred in extreme years (2009, 2018) but it\'s genuinely rare. No need to pack rain gear.',
      },
    ],
    relatedCardTitle: 'Winter Umrah',
  },
];

// ---------- DISTANCE ----------
const distanceFacets: SeoFacet[] = [
  {
    urlSlug: 'umrah-packages-near-haram',
    category: 'distance',
    h1: 'Umrah Packages with Hotels Near the Haram',
    metaTitle: 'Umrah Packages — Hotels Within 500m of the Haram | Searchumrah',
    metaDescription:
      'Compare Umrah packages with Makkah hotels within 500m walking distance of Masjid al-Haram. Comfort for elderly pilgrims, families, mobility-limited travelers.',
    introLede: 'Hotels within 500m of the Haram. The single biggest comfort factor in any Umrah package.',
    bodyParagraphs: [
      'Hotel distance from Masjid al-Haram is the most consequential single variable in an Umrah package. A 200m-walk hotel and a 2km-walk hotel are completely different products: one is a 3-minute stroll multiple times per day; the other is a 30-minute walk each way that becomes exhausting within 48 hours, especially for elderly pilgrims, mobility-limited travelers, or families with young children.',
      'The packages below filter Makkah hotels to 500m or less — comfortable walking distance even for slower pilgrims. This typically corresponds to the central hotel cluster around the Haram: the Clock Tower complex (Fairmont, Pullman Zamzam, Swissôtel, Hilton Suites), the Hilton Convention area, and a handful of 4-star options within the immediate ring.',
      'Premium for close-Haram hotels: typically ₹25,000-₹60,000 more per person vs. a 1.5km-distance hotel for the same duration. For pilgrims for whom mobility matters, the premium usually pays itself back within the first 2-3 days.',
    ],
    payload: { makkahDistanceRange: [0, 500] },
    quickFacts: [
      { label: 'Distance ceiling', value: '≤ 500m from Haram' },
      { label: 'Walk time', value: '~ 3–7 minutes' },
      { label: 'Typical hotels', value: 'Fairmont, Pullman, Hilton, Conrad' },
      { label: 'Premium vs. 1.5km', value: '+ ₹25K – ₹60K' },
    ],
    faqs: [
      {
        question: 'Why does hotel distance from the Haram matter so much?',
        answer:
          'You\'ll walk to the Haram 5+ times per day for Salah, plus Tawaf, plus general worship. A 500m walk is 5 minutes. A 2km walk is 25 minutes — multiplied by 5+ trips daily, that\'s over 4 hours of walking each day. For elderly pilgrims this becomes punishing within 2-3 days, and many end up missing prayers because the round trip is too much.',
      },
      {
        question: 'Which Makkah hotels are under 500m from the Haram?',
        answer:
          'The Clock Tower complex sits directly opposite the Haram\'s King Abdul Aziz Gate: Fairmont, Pullman Zamzam, Swissôtel Al Maqam, Mövenpick Hotel Hajar, and Hilton Suites. Conrad and Hyatt Regency are slightly further but still under 500m. Several Anjum, Marriott, and Crowne Plaza properties also qualify.',
      },
      {
        question: 'Are all hotels under 500m of the Haram 5-star?',
        answer:
          'Mostly yes — proximity drives premium pricing, which drives 5-star service standards. A few 4-star options exist within 500m but they\'re rare. If your budget is under ₹1,30,000 per person, a 500m hotel is unlikely; consider 800m – 1km hotels (e.g., Anjum Makkah, Pullman Madinah Haram side) instead for meaningfully better value.',
      },
      {
        question: 'Are all hotels under 500m within walking distance for elderly pilgrims?',
        answer:
          'Almost always yes. 500m is roughly a 5-minute walk on flat ground for an average adult, 7-10 minutes at slower pace. The Clock Tower complex specifically has covered walkways, escalators, and direct underground access to the Haram\'s King Abdul Aziz Gate — making it the most mobility-friendly option in Makkah.',
      },
    ],
    relatedCardTitle: 'Hotels near the Haram',
  },
];

// ---------- FEATURE (TAG-BASED) ----------
//
// Tag-based facets match against the `packages.tags` TEXT[] column added by
// 20260511010000_add_tags_to_packages.sql. Agents pick tags from the
// curated list in src/constants/packageTags.ts when publishing — keep
// these facets in sync with that list. Tags not surfaced as facets here:
// 'Ramadan' (covered by season facets), 'Short trip' (covered by 7-day
// facet), 'Budget' (covered by /cheap-umrah-packages).
const featureFacets: SeoFacet[] = [
  {
    urlSlug: 'direct-flight-umrah-packages',
    category: 'feature',
    h1: 'Direct Flight Umrah Packages',
    metaTitle: 'Direct Flight Umrah Packages — Non-Stop from India',
    metaDescription:
      'Compare Umrah packages with direct, non-stop flights from India to Jeddah or Madinah. Fewer transit hours, less fatigue, ideal for elderly pilgrims and families.',
    introLede: 'Non-stop flights to Jeddah or Madinah. No layovers, less fatigue, faster arrival.',
    bodyParagraphs: [
      'A direct (non-stop) Umrah flight saves anywhere from 4 to 10 hours vs. a one-stop connection through Dubai, Doha, Sharjah, or Riyadh. For elderly pilgrims, families with young children, and anyone with mobility limitations, that\'s the difference between arriving rested and arriving exhausted. The packages below all use confirmed direct flights from their listed departure city.',
      'In India, direct Umrah flights are most reliable from Delhi, Mumbai, Hyderabad, Bangalore, Kochi, and Calicut — these are the cities Saudi airlines (Saudia, Flynas) and Indian carriers (Air India Express, IndiGo) run regular non-stop service to JED or MED. From smaller cities (Patna, Indore, Aurangabad) direct flights are rare and usually require connecting first to a hub.',
      'Direct-flight packages typically cost 10-25% more than equivalent connecting-flight packages — the airfare itself is higher. Whether the premium is worth it depends on your group: for a 60-year-old performing first Umrah, almost always yes; for a 25-year-old solo traveler, often no.',
    ],
    payload: { tags: ['Direct flight'] },
    quickFacts: [
      { label: 'Flight type', value: 'Non-stop only' },
      { label: 'Common from', value: 'DEL, BOM, HYD, BLR, COK, CCJ' },
      { label: 'Time saved', value: '~ 4 – 10 hours vs. 1-stop' },
      { label: 'Premium', value: '+10–25% over connecting' },
    ],
    faqs: [
      {
        question: 'Which Indian cities have direct flights for Umrah?',
        answer:
          'Reliable direct service to Jeddah (JED) or Madinah (MED) operates from Delhi, Mumbai, Hyderabad, Bangalore, Chennai, Kochi, and Calicut. Saudia, Flynas, Air India Express, and IndiGo are the main carriers. Smaller cities (Pune, Lucknow, Ahmedabad) sometimes get seasonal direct flights, especially in Ramadan and December.',
      },
      {
        question: 'How much extra does a direct-flight Umrah package cost?',
        answer:
          'Typically 10-25% more than the equivalent connecting-flight package. A ₹1,20,000 connecting-flight 10-day package might be ₹1,35,000 – ₹1,50,000 with a direct flight. The premium is driven by the airfare itself, not the agent\'s markup.',
      },
      {
        question: 'Is a direct flight worth the premium for Umrah?',
        answer:
          'For elderly pilgrims, families with young children, or anyone with mobility issues — almost always yes. Connecting flights add 4-10 hours of travel time plus airport navigation, and that fatigue eats into the spiritual focus of arrival day. For young, healthy solo travelers, a 1-stop saving ₹15-25K is often the better trade.',
      },
      {
        question: 'Does "direct" mean the same as "non-stop"?',
        answer:
          'In strict aviation terms, "direct" can include a technical stop without changing planes. In practice, the agents on Searchumrah use "Direct flight" to mean genuine non-stop service — no plane change, no aircraft swap. Confirm specifically with the agent if it matters: ask "non-stop, no aircraft change?"',
      },
    ],
    relatedCardTitle: 'Direct-flight Umrah',
  },
  {
    urlSlug: 'vip-umrah-packages',
    category: 'feature',
    h1: 'VIP Umrah Packages',
    metaTitle: 'VIP Umrah Packages — Premium Service, 5-Star Hotels',
    metaDescription:
      'VIP Umrah packages with premium service, 5-star hotels next to the Haram, private transport, and dedicated coordinators. Verified luxury agents only.',
    introLede: 'Premium service from arrival to departure. Curated 5-star hotels, dedicated coordinators, private transport.',
    bodyParagraphs: [
      'VIP Umrah packages add a service layer on top of premium 5-star hotels. Typical inclusions: private airport meet-and-greet (no waiting in immigration queues), dedicated in-Makkah and in-Madinah coordinators, private transport between cities (vs. shared bus), full board meals at the hotel, and 24/7 concierge support.',
      'For pilgrims traveling with elderly parents, dignitaries, or for high-net-worth individuals who value seamless logistics, the VIP tier removes essentially all friction. The trade-off is cost — VIP Umrah typically runs ₹2.5L+ per person, sometimes ₹4-6L for fully customised private packages.',
      'Not every agent on Searchumrah offers VIP service. The packages tagged VIP below have been flagged by the agent as carrying the additional service layer; confirm the specific inclusions on each package detail page.',
    ],
    payload: { tags: ['VIP'] },
    quickFacts: [
      { label: 'Typical price', value: '₹2,50,000+ per person' },
      { label: 'Hotel category', value: '5-star, < 300m from Haram' },
      { label: 'Transport', value: 'Private (not group bus)' },
      { label: 'Coordinator', value: 'Dedicated, 24/7' },
    ],
    faqs: [
      {
        question: 'What makes an Umrah package "VIP"?',
        answer:
          'Three things beyond standard luxury: (1) private airport handling — no immigration queue, dedicated meet-and-greet; (2) dedicated in-country coordinator(s) for the duration; (3) private transport between Makkah and Madinah instead of shared coach. Most VIP packages also include full board meals and 24/7 concierge support.',
      },
      {
        question: 'How much does a VIP Umrah package cost?',
        answer:
          'Typically ₹2,50,000 to ₹6,00,000 per person. The wide range reflects how customised the package is — group VIP packages with small parties (4-8 pilgrims) sit at the lower end; fully private bespoke packages with personal coordinators and chartered transfers go significantly higher.',
      },
      {
        question: 'Who books VIP Umrah packages?',
        answer:
          'Most commonly: pilgrims traveling with elderly parents who can\'t handle airport queues, families of public figures who need privacy, business travelers combining Umrah with regional meetings, and high-net-worth individuals who want zero logistical friction. The spiritual experience is the same — the trip is built around removing physical and operational stress.',
      },
      {
        question: 'Can I customise a VIP Umrah package?',
        answer:
          'Yes — most VIP-tagged packages are starting points, not fixed itineraries. Agents in this tier expect requests like specific hotel rooms, alternative dates, larger party sizes, or add-on private Ziyarat tours. Contact the agent before booking to confirm what customisation they can offer.',
      },
    ],
    relatedCardTitle: 'VIP Umrah packages',
  },
  {
    urlSlug: 'accessible-umrah-packages',
    category: 'feature',
    h1: 'Accessible Umrah Packages',
    metaTitle: 'Accessible Umrah Packages — Wheelchair, Elderly-Friendly',
    metaDescription:
      'Umrah packages built for accessibility — wheelchair support, elderly-friendly logistics, hotels closest to the Haram, full-time assistance. Verified agents.',
    introLede: 'Built around mobility — wheelchair support, hotels closest to the Haram, full-time assistance.',
    bodyParagraphs: [
      'Accessible Umrah packages are designed for pilgrims with mobility limitations: wheelchair users, elderly pilgrims who can\'t walk long distances, post-surgery travelers, and anyone for whom standard logistics would be physically punishing. The packages tagged "Accessible" below have been flagged by the agent as carrying the necessary support infrastructure.',
      'Key accessibility features: hotels under 300m from the Haram (often with covered walkway access), wheelchair rental and dedicated wheelchair-pusher service inside the Haram, ground-floor or low-floor room assignments, accessible airport transfers (vans with ramps where needed), and slower-paced itineraries with rest buffers built in.',
      'Saudi Arabia has made the Haram itself substantially more accessible in recent years — there are now wheelchair-only Tawaf paths on the upper levels, ramped access to the Mataf, and dedicated wheelchair Sa\'i lanes between Safa and Marwa. An accessibility-aware agent helps you navigate these correctly.',
    ],
    payload: { tags: ['Accessible'] },
    quickFacts: [
      { label: 'Best for', value: 'Wheelchair / elderly / mobility' },
      { label: 'Hotel distance', value: '< 300m from Haram (target)' },
      { label: 'Wheelchair service', value: 'Inside Haram + transfers' },
      { label: 'Pace', value: 'Slower, with rest buffers' },
    ],
    faqs: [
      {
        question: 'What does "accessible" mean in an Umrah package?',
        answer:
          'A package built around mobility limitations: hotels close enough to the Haram that walking is short (under 300m, ideally with covered walkways), wheelchair rental and pusher service inside the Haram itself, accessible airport transfers, ground-floor rooms, and an itinerary paced for slower travel. The agent has the operational experience to handle these logistics.',
      },
      {
        question: 'Is wheelchair Tawaf and Sa\'i possible during Umrah?',
        answer:
          'Yes. The Haram has dedicated wheelchair Tawaf paths on the upper levels (with smoother surfaces and less crowding than the ground floor Mataf), and wheelchair-only lanes for Sa\'i between Safa and Marwa. Wheelchair rental is available at the Haram itself; many accessible packages bundle a dedicated pusher (helper) so the pilgrim doesn\'t need to self-propel.',
      },
      {
        question: 'How much more does an accessible Umrah package cost?',
        answer:
          'Typically 15-30% more than the equivalent standard package. The premium covers closer hotels (which carry their own price uplift), dedicated wheelchair service, and accessible transport. Some agents offer it at no premium if you don\'t require the closest-tier hotel.',
      },
      {
        question: 'Should I book a guided wheelchair-pusher for Umrah?',
        answer:
          'Strongly recommended unless a family member is traveling specifically to help. The Haram\'s wheelchair Tawaf path on the upper level is around 1km per circuit, and pushing a chair for 7 circuits is exhausting. A dedicated pusher (typically ₹1500-3000 for the full Tawaf + Sa\'i) lets the pilgrim and family focus on worship.',
      },
    ],
    relatedCardTitle: 'Accessible Umrah',
  },
  {
    urlSlug: 'popular-umrah-packages',
    category: 'feature',
    h1: 'Popular Umrah Packages',
    metaTitle: 'Popular Umrah Packages — Most-Booked This Season',
    metaDescription:
      'The most-booked Umrah packages on Searchumrah right now. Tagged "Popular" by the agents themselves based on recent demand. Compare and book direct.',
    introLede: 'The packages drawing the most pilgrim interest right now — flagged by the agents themselves.',
    bodyParagraphs: [
      'Popular Umrah packages are the ones agents have flagged based on recent booking volume and inquiry interest. They\'re not necessarily the cheapest or the most premium — they\'re the ones pilgrims are actually choosing. Useful as a starting point if you\'re unsure what configuration (duration, hotel tier, sharing room) fits you.',
      'A package being popular doesn\'t guarantee it fits your needs. The popularity signal aggregates across thousands of pilgrim profiles with different budgets, mobility, and timing constraints. Use it to discover well-regarded options, then check that the specific details — hotel distance, sharing room configuration, departure city, dates — actually match yours.',
      'Many popular packages sell out their seat allocations weeks before departure, especially for Ramadan and December windows. If you see a popular package that fits, contact the agent quickly rather than waiting.',
    ],
    payload: { tags: ['Popular'] },
    quickFacts: [
      { label: 'Tagged by', value: 'Agents based on demand' },
      { label: 'Use as', value: 'Starting point for comparison' },
      { label: 'Seat caution', value: 'Often sells out early' },
      { label: 'Refresh cycle', value: 'Updates weekly' },
    ],
    faqs: [
      {
        question: 'How do packages get tagged as "Popular" on Searchumrah?',
        answer:
          'Agents flag their own packages as Popular based on recent booking volume, inquiry interest, and seat availability. It\'s a self-reported signal — Searchumrah doesn\'t algorithmically rank packages as popular. Consider it the agent saying "this is what pilgrims are actually choosing right now".',
      },
      {
        question: 'Are popular Umrah packages the best ones?',
        answer:
          'They\'re packages that fit a lot of pilgrims well — but "best" depends entirely on your situation. A package popular for short trips from Mumbai may not be best for a longer Ramadan trip from Hyderabad. Use the Popular tag as a discovery shortcut, then filter on your actual constraints (duration, departure city, dates, hotel distance).',
      },
      {
        question: 'Do popular Umrah packages sell out?',
        answer:
          'Frequently, especially for peak windows (Ramadan, December school holidays, Eid). Each package has a fixed seat allocation per departure; once it\'s sold out, the agent either opens a new date or refers you to a similar package. Contact agents early for popular packages in peak windows.',
      },
      {
        question: 'Why isn\'t this package marked Popular even though it looks good?',
        answer:
          'Agents have to actively tag their packages — newer packages or agents who haven\'t logged in recently may have great offerings that aren\'t flagged. Use the Popular tag as one signal among many; agent rating, review count, hotel distance, and inclusions are equally or more important.',
      },
    ],
    relatedCardTitle: 'Popular Umrah packages',
  },
];

// ---------- INDEX & LOOKUP ----------
export const SEO_FACETS: SeoFacet[] = [
  ...budgetFacets,
  ...durationFacets,
  ...seasonFacets,
  ...distanceFacets,
  ...featureFacets,
];

const SEO_FACET_BY_URL_SLUG: Map<string, SeoFacet> = new Map(
  SEO_FACETS.map((f) => [f.urlSlug, f])
);

export function getSeoFacet(urlSlug: string | undefined | null): SeoFacet | undefined {
  if (!urlSlug || typeof urlSlug !== 'string') return undefined;
  return SEO_FACET_BY_URL_SLUG.get(urlSlug.toLowerCase());
}

// Related-facet picker for the bottom-of-page internal-linking block.
// Same category first (preserves topical cluster), then 2-3 cross-category
// picks for breadth. Excludes the current facet.
export function getRelatedFacets(currentSlug: string, n = 8): SeoFacet[] {
  const current = getSeoFacet(currentSlug);
  if (!current) return SEO_FACETS.slice(0, n);
  const sameCategory = SEO_FACETS.filter(
    (f) => f.urlSlug !== currentSlug && f.category === current.category
  );
  const otherCategory = SEO_FACETS.filter(
    (f) => f.urlSlug !== currentSlug && f.category !== current.category
  );
  return [...sameCategory, ...otherCategory].slice(0, n);
}

// Used by next.config.js rewrites — keeps source-of-truth in one file so
// adding a facet only requires editing this array. The rewrite generator
// reads this list and emits one entry per facet.
export function getFacetRewrites(): { source: string; destination: string }[] {
  return SEO_FACETS.map((f) => ({
    source: `/${f.urlSlug}`,
    destination: `/facet/${f.urlSlug}`,
  }));
}
