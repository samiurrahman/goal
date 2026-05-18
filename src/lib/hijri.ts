// Clean Hijri month names. Intl.DateTimeFormat ships ICU spellings with
// ornate quotes (e.g. "Dhuʻl-Hijjah") that look out of place in UI — we
// map by month number to the spellings most commonly used by pilgrims.
const HIJRI_MONTH_NAMES = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Shaban',
  'Ramadan',
  'Shawwal',
  'Dhul Qadah',
  'Dhul Hijjah',
] as const;

const hijriMonthNumberFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  month: 'numeric',
});

function hijriMonthName(date: Date): string {
  const n = parseInt(hijriMonthNumberFmt.format(date), 10);
  return HIJRI_MONTH_NAMES[n - 1] ?? '';
}

/**
 * Returns the Hijri month name(s) that overlap a given Gregorian month.
 * A Gregorian month almost always spans two Hijri months (Hijri months are
 * ~29.5 days), occasionally just one. monthIndex is 0-based (Jan = 0).
 */
export function getHijriMonthsForGregorianMonth(year: number, monthIndex: number): string[] {
  const first = hijriMonthName(new Date(year, monthIndex, 1));
  const last = hijriMonthName(new Date(year, monthIndex + 1, 0));
  return first === last ? [first] : [first, last];
}
