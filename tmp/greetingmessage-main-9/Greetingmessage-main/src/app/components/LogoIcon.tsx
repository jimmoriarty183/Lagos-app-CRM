// Logo Icon only (without text) - for favicons and compact spaces
export function LogoIcon({ size = 16, color }: { size?: number; color?: string }) {
  const boxSize = size;
  const svgSize = size * 0.583; // 16px box = ~9.3px SVG (proportional to 48px box = 28px SVG)
  
  // For dark backgrounds, use white box with dark pattern
  const isDarkMode = color === "#FFFFFF" || color === "white" || color === "#FFF";
  const bgColor = isDarkMode ? "#FFFFFF" : (color || "var(--brand-600)");
  const patternColor = isDarkMode ? "var(--brand-600)" : "#FFFFFF";

  return (
    <div
      className="rounded-lg flex items-center justify-center shrink-0"
      style={{ 
        backgroundColor: bgColor,
        width: `${boxSize}px`,
        height: `${boxSize}px`,
      }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="4" y="4" width="8" height="8" fill={patternColor} />
        <rect x="16" y="4" width="8" height="8" stroke={patternColor} strokeWidth="2" />
        <rect x="4" y="16" width="8" height="8" stroke={patternColor} strokeWidth="2" />
        <rect x="16" y="16" width="8" height="8" fill={patternColor} />
      </svg>
    </div>
  );
}