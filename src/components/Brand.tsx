type BrandImageProps = {
  src: string;
  alt: string;
  className?: string;
  height?: number;
  width?: number;
};

function BrandImage({
  src,
  alt,
  className,
  height,
  width,
}: BrandImageProps) {
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
      }}
    />
  );
}

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

export function BrandLockup({
  iconSize = 48,
  textClassName = "text-4xl",
  className,
  href,
  ariaLabel = "Open Ordo CRM",
}: {
  iconSize?: number;
  textClassName?: string;
  className?: string;
  href?: string;
  ariaLabel?: string;
}) {
  const content = (
    <>
      <BrandIcon size={iconSize} />
      <span
        className={[
          "text-[#1F2937] font-bold leading-none tracking-[-0.04em]",
          textClassName,
        ].join(" ")}
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
        className={["flex items-center gap-3", className].filter(Boolean).join(" ")}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={["flex items-center gap-3", className].filter(Boolean).join(" ")}>
      {content}
    </div>
  );
}

export function BrandWordmark({
  height = 24,
  className,
  alt = "Ordo",
}: {
  variant?: "gradient" | "dark" | "light";
  height?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <BrandImage
      src="/brand/ordo_horizontal.svg"
      alt={alt}
      className={className}
      height={height}
    />
  );
}

export function LoginBrand({
  height = 34,
  className,
}: {
  variant?: "dark" | "light";
  height?: number;
  className?: string;
}) {
  return (
    <BrandImage
      src="/brand/ordo_horizontal.svg"
      alt="Ordo"
      className={className}
      height={height}
    />
  );
}

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
      src="/brand/ordo_horizontal.svg"
      alt={alt}
      className={className}
      height={height}
    />
  );
}

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
      src="/brand/ordo_symbol.svg"
      alt={alt}
      className={className}
      height={size}
      width={size}
    />
  );
}
