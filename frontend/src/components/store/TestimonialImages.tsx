'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadMedia } from '@/lib/upload';

interface TestimonialImagesProps {
  images: string[];
  onChange: (images: string[]) => void;
  onError?: (message: string) => void;
}

const MAX = 30;

/** Screenshots of real customer messages, uploaded from the device. */
export const TestimonialImages: React.FC<TestimonialImagesProps> = ({
  images,
  onChange,
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<number | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])].slice(0, MAX - images.length);
    if (inputRef.current) inputRef.current.value = '';
    if (files.length === 0) return;
    const added: string[] = [];
    for (const [i, file] of files.entries()) {
      setUploading(i + 1);
      try {
        added.push(await uploadMedia(file, 'image'));
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'L’envoi d’une capture a échoué.');
      }
    }
    setUploading(null);
    if (added.length > 0) onChange([...images, ...added]);
  };

  return (
    <div className="space-y-2">
      <p className="text-[14px] font-semibold text-[#201D1D]">
        Captures de témoignages ({images.length})
      </p>
      <p className="text-[13px] text-[#7A808C]">
        Importez des captures d’écran de vrais messages clients (WhatsApp, avis…). Format portrait
        conseillé : 1080 × 1920 px.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {images.map((src, i) => (
          <div
            key={src + i}
            className="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#F1F3F6] border border-[#ECEFF4]"
          >
            <img src={src} alt={`Capture ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              aria-label={`Retirer la capture ${i + 1}`}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/95 text-[#DC2626] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {images.length < MAX && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading !== null}
            className="aspect-[9/16] rounded-xl border-2 border-dashed border-[#D5DAE2] bg-[#F6F7F9] flex flex-col items-center justify-center gap-1 text-[13px] font-semibold text-[#235BF7] cursor-pointer disabled:cursor-wait"
          >
            {uploading !== null ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5" />
            )}
            {uploading !== null ? `Envoi ${uploading}…` : 'Ajouter'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => void handleFiles(e)}
        className="hidden"
      />
    </div>
  );
};
