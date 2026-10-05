'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { uploadMedia } from '@/lib/upload';

interface LogoUploaderProps {
  value: string | null;
  onChange: (url: string) => void;
  /** Letter shown while there is no logo yet. */
  fallback?: string;
  onError?: (message: string) => void;
}

/** Round store logo / profile picture, uploaded straight to Cloudinary. */
export const LogoUploader: React.FC<LogoUploaderProps> = ({
  value,
  onChange,
  fallback = 'J',
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setProgress(0);
    uploadMedia(file, 'image', { onProgress: setProgress })
      .then(onChange)
      .catch((err: unknown) =>
        onError?.(err instanceof Error ? err.message : 'L’envoi du logo a échoué.'),
      )
      .finally(() => setProgress(null));
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        aria-label={value ? 'Changer le logo' : 'Ajouter un logo'}
        className="relative w-20 h-20 rounded-full shrink-0 overflow-hidden border-2 border-dashed border-[#CBD5E1] hover:border-[#235BF7] bg-[#EEF3FF] flex items-center justify-center transition-colors cursor-pointer group"
      >
        {value ? (
          <img src={value} alt="Logo de la boutique" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-black text-[#235BF7]">
            {fallback.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-5 h-5 text-white" />
        </span>
        {progress !== null && (
          <span className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center text-[13px] font-black text-[#235BF7]">
            <Loader2 className="w-5 h-5 animate-spin mb-0.5" />
            {progress}%
          </span>
        )}
      </button>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
          className="text-[15px] font-black text-[#235BF7] hover:underline cursor-pointer disabled:opacity-60"
        >
          {value ? 'Changer le logo' : 'Ajouter le logo de la boutique'}
        </button>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          Votre logo ou une photo de profil. Il apparaît sur votre boutique et vos pages produits.
        </p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
};
