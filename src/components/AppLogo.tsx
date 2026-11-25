import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <div
      className={`shrink-0 select-none overflow-hidden rounded-xl shadow-xs border border-amber-500/30 bg-[#0B2545] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="./logo.png"
        alt="AG File Manager Logo"
        className="w-full h-full object-cover"
      />
    </div>
  );
};
