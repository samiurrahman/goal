/**
 * Image URL helper that produces optimized variants.
 *
 * Free plan: returns the original URL (Next.js Image API handles optimization).
 * Pro plan: rewrites Supabase Storage URLs to use the image transformation
 * endpoint (`/render/image/...`) with width/height/resize/quality params.
 *
 * Toggle via `NEXT_PUBLIC_USE_SUPABASE_TRANSFORMS=true` once you're on Pro.
 */

const TRANSFORMS_ENABLED =
  process.env.NEXT_PUBLIC_USE_SUPABASE_TRANSFORMS === 'true';

export type ImageTransformOpts = {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number;
};

const SUPABASE_OBJECT_PATH = '/storage/v1/object/public/';
const SUPABASE_RENDER_PATH = '/storage/v1/render/image/public/';

export const getOptimizedImageUrl = (
  url: string | null | undefined,
  opts: ImageTransformOpts = {}
): string => {
  if (!url) return '';
  if (!TRANSFORMS_ENABLED) return url;

  const idx = url.indexOf(SUPABASE_OBJECT_PATH);
  if (idx === -1) return url;

  const base = url.slice(0, idx) + SUPABASE_RENDER_PATH;
  const objectPath = url.slice(idx + SUPABASE_OBJECT_PATH.length);

  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.height) params.set('height', String(opts.height));
  if (opts.resize) params.set('resize', opts.resize);
  if (opts.quality) params.set('quality', String(opts.quality));

  const query = params.toString();
  return `${base}${objectPath}${query ? `?${query}` : ''}`;
};
