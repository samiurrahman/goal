import imageCompression from 'browser-image-compression';

export type CompressOpts = {
  /** Target max output size in MB (lossy will adjust quality to hit this). */
  maxSizeMB?: number;
  /** Max width or height — image is resized down to fit. */
  maxWidthOrHeight?: number;
  /** Encoder quality (0–1). 0.85 = visually lossless for photos. */
  quality?: number;
  /** If file is already WebP and smaller than this, skip re-encoding. */
  skipBelowKb?: number;
};

const DEFAULT_OPTS: Required<CompressOpts> = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  quality: 0.85,
  skipBelowKb: 500,
};

/**
 * Compress an image file and convert it to WebP.
 * Falls back to the original file if compression fails.
 *
 * Runs in a Web Worker — does not block the main thread.
 */
export async function compressToWebp(file: File, opts: CompressOpts = {}): Promise<File> {
  const merged = { ...DEFAULT_OPTS, ...opts };

  if (file.type === 'image/webp' && file.size <= merged.skipBelowKb * 1024) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: merged.maxSizeMB,
      maxWidthOrHeight: merged.maxWidthOrHeight,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: merged.quality,
    });

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([compressed], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('Image compression failed, uploading original:', err);
    return file;
  }
}

/**
 * Generate a tiny base64 LQIP (Low-Quality Image Placeholder) data URL.
 * Output is a ~250–500 byte JPEG suitable for `next/image`'s `blurDataURL`.
 *
 * Returns null if the image cannot be decoded (e.g. raw HEIC) or in non-browser env.
 */
export async function generateLqipDataUrl(
  file: File,
  opts: { width?: number; height?: number; quality?: number } = {}
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!file.type.startsWith('image/')) return null;
  if (file.type === 'image/heic' || file.type === 'image/heif') return null;

  const W = opts.width ?? 12;
  const H = opts.height ?? 8;
  const Q = opts.quality ?? 0.4;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, W, H);
    return canvas.toDataURL('image/jpeg', Q);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
