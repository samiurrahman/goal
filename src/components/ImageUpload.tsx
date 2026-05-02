'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { resolvePublicImageUrl, uploadImageToStorage } from '@/utils/supabaseStorageHelper';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  label: string;
  folder: string; // e.g., "users/{uuid}" or "agents/{uuid}/profile"
  currentImageUrl?: string;
  onUploadSuccess: (cdnUrl: string) => void;
  fixedFileName?: string;
  aspectRatio?: 'square' | 'wide' | 'auto'; // For display preview
  maxFileSize?: number; // in bytes, default 5MB
}

export default function ImageUpload({
  label,
  folder,
  currentImageUrl,
  onUploadSuccess,
  fixedFileName,
  aspectRatio = 'square',
  maxFileSize = 5 * 1024 * 1024,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    resolvePublicImageUrl(currentImageUrl) || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(resolvePublicImageUrl(currentImageUrl) || null);
  }, [currentImageUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize) {
      toast.error('File must be smaller than 5MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    const result = await uploadImageToStorage(file, folder, currentImageUrl, {
      fixedFileName,
    });

    if (result.error) {
      toast.error(`Upload failed: ${result.error}`);
      setIsUploading(false);
      return;
    }

    if (result.url) {
      onUploadSuccess(result.url);
      toast.success('Image uploaded successfully');
    }

    setIsUploading(false);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>

      <div
        className={`relative overflow-hidden rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 transition cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 ${
          isUploading ? 'opacity-60 cursor-not-allowed' : ''
        }`}
        onClick={handleClick}
        style={
          aspectRatio === 'square'
            ? { aspectRatio: '1/1' }
            : aspectRatio === 'wide'
              ? { aspectRatio: '16/9' }
              : {}
        }
      >
        {previewUrl ? (
          <Image src={previewUrl} alt="Preview" fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <svg
              className="w-8 h-8 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {isUploading ? 'Uploading...' : 'Click to upload'}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              JPG, PNG, or WebP (max 5MB)
            </p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <div className="animate-spin">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />
    </div>
  );
}
