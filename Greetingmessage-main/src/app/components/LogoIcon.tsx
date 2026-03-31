export function LogoIcon({
  size = 16,
  color,
}: {
  size?: number;
  color?: string;
}) {
  const boxSize = size;

  // Brand color from Figma: #5B5BB3
  const isDarkMode =
    color === "#FFFFFF" || color === "white" || color === "#FFF";
  const bgColor = isDarkMode ? "#FFFFFF" : color || "#5B5BB3";
  const patternColor = isDarkMode ? "#5B5BB3" : "#FFFFFF";

  return (
    <div
      className="rounded-lg flex items-center justify-center shrink-0"
      style={{
        backgroundColor: bgColor,
        width: `${boxSize}px`,
        height: `${boxSize}px`,
        borderRadius: `${size * 0.1875}px`,
      }}
    >
      <svg
        width={size * 0.583}
        height={size * 0.583}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top-left square */}
        <rect x="7" y="7" width="6" height="6" rx="1" fill={patternColor} />
        {/* Top-right square */}
        <rect x="15" y="7" width="6" height="6" rx="1" fill={patternColor} />
        {/* Bottom-left square */}
        <rect x="7" y="15" width="6" height="6" rx="1" fill={patternColor} />
        {/* Bottom-right square */}
        <rect x="15" y="15" width="6" height="6" rx="1" fill={patternColor} />
      </svg>
    </div>
  );
}
