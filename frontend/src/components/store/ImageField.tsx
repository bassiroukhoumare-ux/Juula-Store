'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { uploadMedia } from '@/lib/upload';

interface ImageFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  /** Tailwind aspect class of the preview, e.g. "aspect-[3/1]". */
  aspect?: string;
  onError?: (message: string) => void;
  /** Recommended size shown under the field, e.g. « 1920 × 720 px ». */
  hint?: string;
}

/** Image picked from the device, uploaded straight to Cloudinary. */
export const ImageField: React.FC<ImageFieldProps> = ({
  value,
  onChange,
  label,
  aspect = 'aspect-[16/7]',
  onError,
  hint,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setProgress(0);
    uploadMedia(file, 'image', { onProgress: setProgress })
      .then((url) => onChange(url))
      .catch((err: unknown) =>
        onError?.(err instanceof Error ? err.message : 'L’envoi de l’image a échoué.'),
      )
      .finally(() => setProgress(null));
  };

  return (
    <div className="space-y-1.5">
      <span className="text-[14px] font-semibold text-[#201D1D]">{label}</span>
      <div
        className={`relative ${aspect} w-full rounded-2xl overflow-hidden border border-dashed border-[#D5DAE2] bg-[#F6F7F9]`}
      >
        {value && (
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-2 p-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={progress !== null}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/95 border border-[#E3E7EE] text-[14px] font-semibold text-[#201D1D] hover:bg-white cursor-pointer disabled:cursor-wait"
          >
            {progress !== null ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {progress}%
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4 text-[#235BF7]" />
                {value ? 'Changer' : 'Ajouter une image'}
              </>
            )}
          </button>
          {value && progress === null && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Retirer l’image"
              className="w-10 h-10 rounded-full bg-white/95 border border-[#E3E7EE] text-[#DC2626] flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {hint && <p className="text-[13px] text-[#7A808C]">{hint}</p>}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
};
