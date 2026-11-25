import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      aria-label="AG File Manager Logo"
    >
      <defs>
        <linearGradient id="appLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="appLogoFolderBack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="appLogoFolderFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Squircle Base with border */}
      <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#appLogoBg)" />
      <rect
        x="8.5"
        y="8.5"
        width="111"
        height="111"
        rx="27.5"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />

      {/* Folder Back Plate */}
      <path
        d="M 28 42 C 28 39 30 37 33 37 L 50 37 C 53 37 55 39 57 42 L 62 47 L 95 47 C 98 47 100 49 100 52 L 100 86 C 100 89 98 91 95 91 L 33 91 C 30 91 28 89 28 86 Z"
        fill="url(#appLogoFolderBack)"
      />

      {/* Document Sheet */}
      <rect x="36" y="44" width="56" height="42" rx="4" fill="#FFFFFF" opacity="0.95" />
      <rect x="42" y="50" width="30" height="3" rx="1.5" fill="#94A3B8" />
      <rect x="42" y="56" width="44" height="3" rx="1.5" fill="#CBD5E1" />
      <rect x="42" y="62" width="38" height="3" rx="1.5" fill="#E2E8F0" />

      {/* Folder Front Pocket */}
      <path
        d="M 26 53 L 102 53 C 103.5 53 104.5 54.5 104 56 L 98 87 C 97.5 89.5 95 91 92.5 91 L 35.5 91 C 33 91 30.5 89.5 30 87 L 24 56 C 23.5 54.5 24.5 53 26 53 Z"
        fill="url(#appLogoFolderFront)"
      />

      {/* AG Monogram Badge */}
      <rect x="62" y="67" width="38" height="20" rx="6" fill="#0F172A" opacity="0.92" />
      <text
        x="81"
        y="81.5"
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="800"
        fill="#38BDF8"
        textAnchor="middle"
        letterSpacing="1"
      >
        AG
      </text>
    </svg>
  );
};
