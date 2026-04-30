"use client";

interface BrandImageProps {
  src: string;
  alt: string;
  className?: string;
  height?: number;
  width?: number;
}

function BrandImage({ src, alt, className, height, width }: BrandImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      height={height}
      width={width}
      style={{
        height: height ? `${height}px` : undefined,
        width: width ? `${width}px` : undefined,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}

function BrandSymbol({
  size,
  bgColor,
  patternColor,
  className,
  alt,
}: {
  size: number;
  bgColor: string;
  patternColor: string;
  className?: string;
  alt?: string;
}) {
  const svgSize = size * 0.583;
  return (
    <div
      className={["rounded-lg flex items-center justify-center shrink-0", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        backgroundColor: bgColor,
        width: `${size}px`,
        height: `${size}px`,
      }}
      aria-label={alt}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="8" height="8" fill={patternColor} />
        <rect x="16" y="4" width="8" height="8" stroke={patternColor} strokeWidth="2" />
        <rect x="4" y="16" width="8" height="8" stroke={patternColor} strokeWidth="2" />
        <rect x="16" y="16" width="8" height="8" fill={patternColor} />
      </svg>
    </div>
  );
}

/**
 * BrandIcon - Icon only (Square Grid symbol)
 * Uses exact grid geometry from Greetingmessage-main logo component
 *
 * Brand color: var(--brand-600) - Muted Purple (#5B5BB3)
 */
export function BrandIcon({
  size = 32,
  className,
  alt = "Ordo",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <BrandSymbol
      size={size}
      bgColor="#5B5BB3"
      patternColor="#FFFFFF"
      className={className}
      alt={alt}
    />
  );
}

/**
 * BrandIconDarkBg - Icon with white background for dark surfaces
 * Uses exact grid geometry from Greetingmessage-main logo component
 */
export function BrandIconDarkBg({
  size = 40,
  className,
  alt = "Ordo",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <BrandSymbol
      size={size}
      bgColor="#FFFFFF"
      patternColor="#5B5BB3"
      className={className}
      alt={alt}
    />
  );
}

/**
 * BrandLockup - Full logo with icon and text
 * Uses exact brand assets from /public/brand/
 *
 * Usage:
 * <BrandLockup iconSize={34} textClassName="text-[1.75rem]" />
 */
export function BrandLockup({
  iconSize = 32,
  textClassName = "text-4xl",
  className,
  href,
  ariaLabel = "Open Ordo CRM",
  variant = "default",
}: {
  iconSize?: number;
  textClassName?: string;
  className?: string;
  href?: string;
  ariaLabel?: string;
  variant?: "default" | "dark-bg";
}) {
  const isDarkBg = variant === "dark-bg";
  // Single brand mark across both themes: purple box with white grid pattern.
  // dark-bg variant inverts to a white box with purple grid for explicit
  // overrides on inherently dark surfaces (kept for backwards compatibility).
  // Text colour follows --text-primary so the wordmark reads in both themes.
  const bgColor = isDarkBg ? "#FFFFFF" : "var(--brand-600)";
  const patternColor = isDarkBg ? "var(--brand-600)" : "#FFFFFF";
  const textColor = isDarkBg ? "#FFFFFF" : "var(--text-primary)";
  const boxSize = iconSize * 1.125;
  const svgSize = iconSize * 0.625;
  const textSize = iconSize * 0.625;

  const content = (
    <>
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
          aria-hidden="true"
        >
          <rect x="4" y="4" width="8" height="8" fill={patternColor} />
          <rect x="16" y="4" width="8" height="8" stroke={patternColor} strokeWidth="2" />
          <rect x="4" y="16" width="8" height="8" stroke={patternColor} strokeWidth="2" />
          <rect x="16" y="16" width="8" height="8" fill={patternColor} />
        </svg>
      </div>
      <span
        className={textClassName}
        style={{
          color: textColor,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          fontSize: `${textSize}px`,
        }}
      >
        Ordo
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        className={["flex items-center gap-3", className]
          .filter(Boolean)
          .join(" ")}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={["flex items-center gap-3", className]
        .filter(Boolean)
        .join(" ")}
    >
      {content}
    </div>
  );
}

/**
 * BrandWordmark - Text-only logo (wordmark)
 * Uses exact brand asset: /brand/wordmark-dark.svg
 */
export function BrandWordmark({
  height = 24,
  className,
  alt = "Ordo",
  variant = "dark",
}: {
  variant?: "gradient" | "dark" | "light";
  height?: number;
  className?: string;
  alt?: string;
}) {
  const src =
    variant === "light"
      ? "/brand/wordmark-light.svg"
      : variant === "gradient"
        ? "/brand/wordmark-gradient.svg"
        : "/brand/wordmark-dark.svg";

  return (
    <BrandImage src={src} alt={alt} className={className} height={height} />
  );
}

/**
 * LoginBrand - Logo for login pages
 * Uses exact brand asset: /brand/login-brand-dark.svg or /brand/login-brand-light.svg
 */
export function LoginBrand({
  height = 34,
  className,
  variant = "dark",
}: {
  variant?: "dark" | "light";
  height?: number;
  className?: string;
}) {
  const src =
    variant === "light"
      ? "/brand/login-brand-light.svg"
      : "/brand/login-brand-dark.svg";

  return (
    <BrandImage src={src} alt="Ordo" className={className} height={height} />
  );
}

/**
 * BrandLogoDarkBg - Full logo with white background for dark surfaces
 * Uses exact brand asset: /brand/logo-dark-bg.svg
 */
export function BrandLogoDarkBg({
  height = 46,
  className,
  alt = "Ordo",
}: {
  height?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <BrandImage
      src="/brand/logo-dark-bg.svg"
      alt={alt}
      className={className}
      height={height}
    />
  );
}
