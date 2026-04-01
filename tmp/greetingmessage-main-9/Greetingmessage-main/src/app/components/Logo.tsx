export function Logo({ size = 32, color }: { size?: number; color?: string }) {
  const iconSize = size;
  const boxSize = size * 1.125; // Proportional box size
  const svgSize = size * 0.625; // SVG scales with logo
  const textSize = size * 0.625; // Text scales with logo
  
  // For dark backgrounds, use white box with dark pattern
  const isDarkMode = color === "#FFFFFF" || color === "white" || color === "#FFF";
  const bgColor = isDarkMode ? "#FFFFFF" : (color || "var(--brand-600)");
  const patternColor = isDarkMode ? "var(--brand-600)" : "#FFFFFF";

  return (
    <div className="flex items-center gap-3">
      <div
        className="rounded-lg flex items-center justify-center"
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
      <span
        className="tracking-tight"
        style={{
          color: color || "var(--neutral-900)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          fontSize: `${textSize}px`,
        }}
      >
        Ordo
      </span>
    </div>
  );
}