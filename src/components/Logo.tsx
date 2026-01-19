interface LogoProps {
  size?: number;
  variant?: "dark" | "light";
}

export function Logo({ size = 48, variant = "dark" }: LogoProps) {
  const colors = {
    dark: {
      square: "#0F172A", // dark navy/slate
      dot: "#3B82F6", // blue accent
    },
    light: {
      square: "#FFFFFF",
      dot: "#3B82F6",
    },
  };

  const currentColors = colors[variant];

  // Calculate proportions based on size
  const borderRadius = size * 0.25; // 25% rounded corners
  const dotSize = size * 0.25; // dot is 25% of container
  const dotPosition = (size - dotSize) / 2; // center the dot

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* Rounded square */}
      <rect
        width={size}
        height={size}
        rx={borderRadius}
        fill={currentColors.square}
      />

      {/* Center dot (status indicator) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={dotSize / 2}
        fill={currentColors.dot}
      />
    </svg>
  );
}
