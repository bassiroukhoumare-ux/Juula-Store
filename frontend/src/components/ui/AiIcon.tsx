import React, { useId } from 'react';

/**
 * AI mark: a four-point sparkle (the de-facto « generative AI » symbol) with a
 * small companion star. `tone="gradient"` for light surfaces, `tone="white"`
 * inside filled buttons.
 */
export function AiIcon({
  className = 'w-5 h-5',
  tone = 'gradient',
}: {
  className?: string;
  tone?: 'gradient' | 'white';
}) {
  const id = useId().replace(/:/g, '');
  const fill = tone === 'white' ? '#FFFFFF' : `url(#ai-${id})`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {tone === 'gradient' && (
        <defs>
          <linearGradient
            id={`ai-${id}`}
            x1="3"
            y1="3"
            x2="21"
            y2="21"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#235BF7" />
            <stop offset="0.55" stopColor="#6D4AFF" />
            <stop offset="1" stopColor="#B03CF0" />
          </linearGradient>
        </defs>
      )}
      <path
        fill={fill}
        d="M10.5 3.2c.36 3.94 3.36 6.94 7.3 7.3-3.94.36-6.94 3.36-7.3 7.3-.36-3.94-3.36-6.94-7.3-7.3 3.94-.36 6.94-3.36 7.3-7.3Z"
      />
      <path
        fill={fill}
        opacity={0.85}
        d="M18.2 14.6c.17 1.84 1.57 3.24 3.4 3.4-1.83.17-3.23 1.57-3.4 3.4-.17-1.83-1.57-3.23-3.4-3.4 1.83-.16 3.23-1.56 3.4-3.4Z"
      />
    </svg>
  );
}
