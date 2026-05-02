import { supabase } from '@/utils/supabaseClient';

export const STORAGE_BUCKET = 'uploads';

/**
 * Extract storage path from full CDN URL
 * e.g., "https://project.supabase.co/storage/v1/object/public/uploads/users/uuid/profile.jpg"
 * returns "users/uuid/profile.jpg"
 */
export const extractPathFromUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/uploads\/(.+)$/);
    if (match?.[1]) return match[1];

    const fallbackMatch = url.match(/\/uploads\/(.+)$/);
    if (fallbackMatch?.[1]) return fallbackMatch[1];

    const trimmed = url.trim();
    if (trimmed.startsWith('users/') || trimmed.startsWith('agents/')) {
      return trimmed;
    }

    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Generate full CDN URL from storage path
 */
export const generateCdnUrl = (path: string): string => {
  const normalizedPath = (path || '').replace(/^\/+/, '').replace(/^uploads\//, '');
  if (!normalizedPath) return '';
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(normalizedPath);
  return data.publicUrl;
};

/**
 * Resolve either a full URL, a relative storage URL, or a plain object path
 * into a public CDN URL.
 */
export const resolvePublicImageUrl = (urlOrPath?: string | null): string | undefined => {
  if (!urlOrPath) return undefined;

  const value = urlOrPath.trim();
  if (!value) return undefined;

  if (/^https?:\/\//i.test(value)) return value;

  const extractedPath = extractPathFromUrl(value);
  const normalizedPath = (extractedPath || value)
    .replace(/^\/+/, '')
    .replace(/^storage\/v1\/object\/public\/uploads\//, '')
    .replace(/^uploads\//, '');

  if (!normalizedPath) return undefined;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(normalizedPath);
  return data.publicUrl;
};

/**
 * Delete image from storage by URL or path
 */
export const deleteImageFromStorage = async (
  urlOrPath: string
): Promise<{ success: boolean; error?: string }> => {
  if (!urlOrPath) return { success: true }; // No-op if empty

  const path = urlOrPath.startsWith('http') ? extractPathFromUrl(urlOrPath) : urlOrPath;

  if (!path) {
    return { success: false, error: 'Invalid image URL or path' };
  }

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);

  if (error) {
    console.warn(`Failed to delete image at ${path}:`, error.message);
    // Don't fail the whole operation if delete fails—user should still be able to re-upload
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * Upload image to storage and return relative path
 * Automatically deletes old file if provided
 */
export const uploadImageToStorage = async (
  file: File,
  folder: string, // e.g., "users/{uuid}" or "agents/{uuid}/profile"
  oldImageUrlOrPath?: string,
  options?: { fixedFileName?: string }
): Promise<{ path: string | null; url: string | null; error?: string }> => {
  // Validate file
  if (!file) {
    return { path: null, url: null, error: 'No file provided' };
  }

  const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validMimes.includes(file.type)) {
    return { path: null, url: null, error: 'Only JPG, PNG, and WebP allowed' };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { path: null, url: null, error: 'File must be smaller than 5MB' };
  }

  // Delete old image if provided
  if (oldImageUrlOrPath) {
    const deleteResult = await deleteImageFromStorage(oldImageUrlOrPath);
    if (!deleteResult.success) {
      console.warn('Old image deletion failed, continuing with new upload:', deleteResult.error);
    }
  }

  // Use fixed file name when caller wants a single image slot (profile/banner/etc.)
  const ext = file.name.split('.').pop() || 'jpg';
  const fixedFileName = (options?.fixedFileName || '').trim();
  const filename = fixedFileName ? `${fixedFileName}.${ext}` : `${Date.now()}.${ext}`;
  const fullPath = `${folder}/${filename}`;

  if (fixedFileName) {
    const sameSlotCandidates = [
      `${folder}/${fixedFileName}.jpg`,
      `${folder}/${fixedFileName}.jpeg`,
      `${folder}/${fixedFileName}.png`,
      `${folder}/${fixedFileName}.webp`,
    ].filter((path, index, self) => self.indexOf(path) === index && path !== fullPath);

    if (sameSlotCandidates.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(sameSlotCandidates);
    }
  }

  // Upload
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(fullPath, file, {
    cacheControl: '3600',
    upsert: !!fixedFileName,
  });

  if (error) {
    return { path: null, url: null, error: error.message };
  }

  const cdnUrl = generateCdnUrl(data.path);
  return { path: data.path, url: cdnUrl, error: undefined };
};
