-- Move package purchase-summary data: default to packages, full config to package_details

ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS default_pricing jsonb;

ALTER TABLE public.package_details
ADD COLUMN IF NOT EXISTS purchase_summary jsonb;

-- Backfill packages.default_pricing from old sharing_rate default (or fallback to price_per_person/currency)
UPDATE public.packages p
SET default_pricing = COALESCE(
  (
    SELECT jsonb_build_object(
      'people', COALESCE((rate_elem->>'people')::int, 5),
      'value', COALESCE((rate_elem->>'value')::numeric, p.price_per_person),
      'currency', COALESCE(p.currency, 'INR')
    )
    FROM jsonb_array_elements(
      COALESCE(
        (p.sharing_rate::jsonb->'json'->'rates'),
        (p.sharing_rate::jsonb->'rates'),
        '[]'::jsonb
      )
    ) AS rate_elem
    WHERE COALESCE((rate_elem->>'default')::boolean, false) = true
    LIMIT 1
  ),
  jsonb_build_object(
    'people', 5,
    'value', COALESCE(p.price_per_person, 0),
    'currency', COALESCE(p.currency, 'INR')
  )
)
WHERE p.default_pricing IS NULL;

-- Backfill package_details.purchase_summary from packages.sharing_rate where possible
UPDATE public.package_details d
SET purchase_summary = jsonb_build_object(
  'rates', COALESCE(
    (p.sharing_rate::jsonb->'json'->'rates'),
    (p.sharing_rate::jsonb->'rates'),
    '[]'::jsonb
  ),
  'currency', COALESCE(p.currency, 'INR'),
  'min_guests', 1,
  'max_guests', 20
)
FROM public.packages p
WHERE p.id = d.package_id
  AND d.purchase_summary IS NULL;
