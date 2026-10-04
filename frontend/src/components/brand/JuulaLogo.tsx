import React from 'react';

// Official Juula logo (public/logo-juula.svg, 400.86 × 153.11).
const LOGO_RATIO = 400.86 / 153.11;

interface JuulaLogoProps {
  /** Rendered height in px; width follows the logo's aspect ratio. */
  height?: number;
  className?: string;
}

export const JuulaLogo: React.FC<JuulaLogoProps> = ({ height = 32, className }) => (
  <img
    src="/logo-juula.svg"
    alt="Juula"
    width={Math.round(height * LOGO_RATIO)}
    height={height}
    className={className}
    draggable={false}
  />
);
