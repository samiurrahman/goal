'use client';

import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonSecondary from '@/shared/ButtonSecondary';

interface ImageCropModalProps {
  open: boolean;
  file: File | null;
  aspect: number;
  cropShape?: 'rect' | 'round';
  title?: string;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// Bake the chosen crop region into a fresh File. We keep the original file's
// base name so the downstream WebP compression step in supabaseStorageHelper
// still produces a sensibly-named blob. PNG sources stay PNG (preserve any
// transparency the cropper exposed); anything else flattens to JPEG which is
// smaller before compression and avoids canvas alpha surprises on solid backgrounds.
const cropImageToFile = async (
  file: File,
  dataUrl: string,
  area: Area
): Promise<File> => {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const ext = outputType === 'image/png' ? 'png' : 'jpg';
  const quality = 0.92;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, quality)
  );
  if (!blob) throw new Error('Failed to encode cropped image');

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.${ext}`, {
    type: outputType,
    lastModified: Date.now(),
  });
};

export default function ImageCropModal({
  open,
  file,
  aspect,
  cropShape = 'rect',
  title = 'Adjust image',
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open || !file) {
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (cancelled) return;
        setImageSrc(dataUrl);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
      } catch {
        if (cancelled) return;
        setImageSrc(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, file]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!file || !imageSrc || !croppedAreaPixels || processing) return;
    setProcessing(true);
    try {
      const cropped = await cropImageToFile(file, imageSrc, croppedAreaPixels);
      onConfirm(cropped);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-[100] overflow-y-auto" onClose={onCancel}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-neutral-900/70" />
          </Transition.Child>

          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-2xl my-8 text-left align-middle transition-all transform bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
                <Dialog.Title className="text-base font-semibold text-neutral-900 dark:text-white">
                  {title}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="relative h-[55vh] max-h-[480px] min-h-[280px] w-full bg-neutral-900">
                {imageSrc ? (
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
                    cropShape={cropShape}
                    showGrid={cropShape === 'rect'}
                    restrictPosition
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
                    Loading image…
                  </div>
                )}
              </div>

              <div className="space-y-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="image-crop-zoom"
                    className="w-12 shrink-0 text-xs font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Zoom
                  </label>
                  <input
                    id="image-crop-zoom"
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    disabled={!imageSrc}
                    className="flex-1 accent-primary-6000 disabled:opacity-50"
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Drag the image to reposition. Use the slider, scroll, or pinch to zoom.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3 dark:border-neutral-700">
                <ButtonSecondary
                  onClick={onCancel}
                  disabled={processing}
                  sizeClass="px-4 py-2"
                  fontSize="text-sm font-medium"
                >
                  Cancel
                </ButtonSecondary>
                <ButtonPrimary
                  onClick={handleConfirm}
                  disabled={!croppedAreaPixels || processing}
                  sizeClass="px-4 py-2"
                  fontSize="text-sm font-medium"
                >
                  {processing ? 'Saving…' : 'Save'}
                </ButtonPrimary>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
