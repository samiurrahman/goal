'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { resolvePublicImageUrl, uploadImageToStorage } from '@/utils/supabaseStorageHelper';
import { showApiError } from '@/lib/apiErrors';
import ImageCropModal from '@/components/ImageCropModal';

// Banner + overlapping circular avatar editor for the profile page — mirrors
// the layout of the public /[agentName] header so the agent edits what they
// actually see. Hovering the banner or the avatar reveals a "change" control;
// clicking anywhere on either opens the file picker.
//
// Upload is immediate to storage. If onPersist is provided, the corresponding
// agents column is written to the DB right after upload so the change survives
// a reload without the agent having to click "Update info" — matches the
// FB/LinkedIn "change photo" mental model. Other form fields still save on
// the explicit Update info click.

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface BannerAvatarEditorProps {
  agentId: string;
  bannerUrl: string;
  profileUrl: string;
  legalName: string;
  knownAs: string;
  onBannerChange: (url: string) => void;
  onProfileChange: (url: string) => void;
  onPersist?: (slot: 'banner' | 'profile', url: string) => Promise<{ ok: boolean }>;
}

const initialsFrom = (value: string): string => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function BannerAvatarEditor({
  agentId,
  bannerUrl,
  profileUrl,
  legalName,
  knownAs,
  onBannerChange,
  onProfileChange,
  onPersist,
}: BannerAvatarEditorProps) {
  const [bannerUploading, setBannerUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pendingCrop, setPendingCrop] = useState<{
    slot: 'banner' | 'profile';
    file: File;
  } | null>(null);
  // Optimistic local previews. Stay set the moment a crop is confirmed so the
  // agent sees the new image instantly while the upload runs. Cleared once
  // the resolved CDN URL has visibly changed (URLs include a ?v=… cache-bust
  // from supabaseStorageHelper so the change is detectable even when the
  // underlying object path is the same).
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);
  const [localProfilePreview, setLocalProfilePreview] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const resolvedBanner = resolvePublicImageUrl(bannerUrl);
  const resolvedProfile = resolvePublicImageUrl(profileUrl);
  const displayBanner = localBannerPreview || resolvedBanner;
  const displayProfile = localProfilePreview || resolvedProfile;
  const displayName = knownAs.trim() || legalName.trim() || 'Your business';

  const queueForCrop = (file: File | undefined, slot: 'banner' | 'profile') => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be smaller than 5MB');
      return;
    }
    setPendingCrop({ slot, file });
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleCropConfirm = async (croppedFile: File) => {
    if (!pendingCrop) return;
    const { slot } = pendingCrop;
    setPendingCrop(null);

    const setUploading = slot === 'banner' ? setBannerUploading : setAvatarUploading;
    const setLocalPreview = slot === 'banner' ? setLocalBannerPreview : setLocalProfilePreview;
    const onChange = slot === 'banner' ? onBannerChange : onProfileChange;
    const currentUrl = slot === 'banner' ? bannerUrl : profileUrl;

    // Show the cropped image immediately so the agent gets instant feedback,
    // independent of how long the upload + CDN propagation takes.
    try {
      const dataUrl = await readFileAsDataUrl(croppedFile);
      setLocalPreview(dataUrl);
    } catch {
      // Preview is best-effort; the upload still proceeds.
    }

    setUploading(true);
    const result = await uploadImageToStorage(croppedFile, `agents/${agentId}`, currentUrl, {
      fixedFileName: slot,
    });
    setUploading(false);
    if (result.error) {
      setLocalPreview(null);
      showApiError(new Error(result.error), { message: 'Upload failed. Please try again.' });
      return;
    }
    if (result.url) {
      onChange(result.url);
      // Let the resolved URL take over on the next render — the URL carries a
      // ?v=… cache-buster so <Image> sees a new src.
      setLocalPreview(null);

      // Persist this one column to the agents row immediately so a reload
      // doesn't show the old image. Other form fields still wait for the
      // explicit Update info click.
      if (onPersist) {
        const persistResult = await onPersist(slot, result.url);
        if (persistResult.ok) {
          toast.success(`${slot === 'banner' ? 'Banner' : 'Profile photo'} saved.`);
        }
        // On failure the parent surfaces its own error toast.
      } else {
        toast.success(
          `${slot === 'banner' ? 'Banner' : 'Profile photo'} updated — click "Update info" to save.`
        );
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      {/* ── Banner ── */}
      <div
        className="group relative aspect-[4/1] min-h-[150px] cursor-pointer"
        onClick={() => !bannerUploading && bannerInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Change banner image"
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !bannerUploading) {
            e.preventDefault();
            bannerInputRef.current?.click();
          }
        }}
        style={
          displayBanner
            ? undefined
            : {
                background:
                  'radial-gradient(120% 100% at 20% 0%, rgba(99,102,241,0.20) 0%, transparent 60%), radial-gradient(100% 100% at 90% 100%, rgba(20,184,166,0.18) 0%, transparent 55%), linear-gradient(135deg, rgb(var(--c-primary-800)) 0%, rgb(var(--c-primary-900)) 100%)',
              }
        }
      >
        {displayBanner ? (
          localBannerPreview ? (
            // Plain <img> for data URLs — next/image's optimizer can't handle them.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={localBannerPreview}
              alt="Profile banner preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Image
              src={displayBanner}
              alt="Profile banner"
              fill
              className="object-cover"
              sizes="100vw"
            />
          )
        ) : null}

        {/* Hover affordance */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
          <span className="pointer-events-none flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-neutral-800 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {resolvedBanner ? 'Change banner' : 'Add banner image'}
          </span>
        </div>

        {bannerUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      {/* ── Avatar + identity ── */}
      <div className="flex items-end gap-4 px-5 pb-5 md:px-7">
        <div
          className="group relative -mt-12 h-[92px] w-[92px] shrink-0 cursor-pointer overflow-hidden rounded-full border-[4px] border-white bg-white shadow-md dark:border-neutral-900 md:h-[104px] md:w-[104px]"
          onClick={() => !avatarUploading && avatarInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Change profile photo"
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !avatarUploading) {
              e.preventDefault();
              avatarInputRef.current?.click();
            }
          }}
        >
          {displayProfile ? (
            localProfilePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={localProfilePreview}
                alt="Profile photo preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Image
                src={displayProfile}
                alt={displayName}
                fill
                className="object-cover"
                sizes="104px"
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 text-2xl font-semibold tracking-tight text-white">
              {initialsFrom(displayName)}
            </div>
          )}

          {/* Hover affordance — camera icon */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/45">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>

          {avatarUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>

        <div className="min-w-0 pb-1">
          <p className="truncate text-lg font-semibold leading-tight text-neutral-900 dark:text-white">
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
            {legalName.trim() ? legalName.trim() : 'Legal name not set'}
          </p>
        </div>
      </div>

      <input
        ref={bannerInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={bannerUploading}
        onChange={(e) => {
          queueForCrop(e.target.files?.[0], 'banner');
          e.target.value = '';
        }}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={avatarUploading}
        onChange={(e) => {
          queueForCrop(e.target.files?.[0], 'profile');
          e.target.value = '';
        }}
      />

      <ImageCropModal
        open={!!pendingCrop}
        file={pendingCrop?.file ?? null}
        aspect={pendingCrop?.slot === 'banner' ? 4 / 1 : 1}
        cropShape={pendingCrop?.slot === 'profile' ? 'round' : 'rect'}
        title={pendingCrop?.slot === 'banner' ? 'Adjust banner' : 'Adjust profile photo'}
        onCancel={() => setPendingCrop(null)}
        onConfirm={(cropped) => {
          void handleCropConfirm(cropped);
        }}
      />
    </div>
  );
}
