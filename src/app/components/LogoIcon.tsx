"use client";

interface LogoIconProps {
  size?: number;
  color?: string;
}

/**
 * Logo icon component (without text) using exact brand assets from /public/brand/
 * 
 * Usage:
 * <LogoIcon size={16} />                // Small for favicon-sized spaces
 * <LogoIcon size={24} />                // Medium for mobile menus
 * <LogoIcon size={32} />                // Default for sidebar
 * <LogoIcon size={32} color="#FFFFFF" /> // On dark background
 */
export function LogoIcon({ size = 32, color }: LogoIconProps) {
  const isDarkMode = color === "#FFFFFF" || color === "white" || color === "#FFF";
  
  // Use the exact brand asset - ordo_symbol.svg for icon only
  // The SVG already has the correct colors (purple box #5B5BB3, white pattern)
  const iconSrc = isDarkMode ? "/brand/icon-dark-bg.svg" : "/brand/ordo_symbol.svg";

  return (
    <img
      src={iconSrc}
      alt="Ordo"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
