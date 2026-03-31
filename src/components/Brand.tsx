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

/**
 * BrandIcon - Icon only (Square Grid symbol)
 * Uses exact brand asset: /brand/ordo_symbol.svg
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
    <BrandImage
      src="/brand/ordo_symbol.svg"
      alt={alt}
      className={className}
      height={size}
      width={size}
    />
  );
}

/**
 * BrandIconDarkBg - Icon with white background for dark surfaces
 * Uses exact brand asset: /brand/icon-dark-bg.svg
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
    <BrandImage
      src="/brand/icon-dark-bg.svg"
      alt={alt}
      className={className}
      height={size}
      width={size}
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
  iconSize = 48,
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
  // For dark backgrounds, use the inverted logo asset
  const logoSrc =
    variant === "dark-bg"
      ? "/brand/logo-dark-bg.svg"
      : "/brand/ordo_horizontal.svg";

  const content = (
    <img
      src={logoSrc}
      alt="Ordo"
      style={{
        height: `${iconSize}px`,
        width: `${iconSize * 3.75}px`, // Maintain aspect ratio (180/48 = 3.75)
        objectFit: "contain",
        display: "block",
      }}
    />
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
