type BrandImageProps = {
  className?: string;
  height?: number;
  width?: number;
  alt?: string;
};

function BrandImage({
  src,
  alt,
  className,
  height,
  width,
}: BrandImageProps & { src: string }) {
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
      }}
    />
  );
}

export function BrandIcon({
  size = 28,
  className,
  alt = "Corelix",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <BrandImage
      src="/brand/icon.svg"
      alt={alt}
      className={className}
      height={size}
      width={size}
    />
  );
}

export function BrandWordmark({
  variant = "gradient",
  height = 24,
  className,
  alt = "Corelix",
}: {
  variant?: "gradient" | "dark" | "light";
  height?: number;
  className?: string;
  alt?: string;
}) {
  const srcMap = {
    gradient: "/brand/wordmark-gradient.svg",
    dark: "/brand/wordmark-dark.svg",
    light: "/brand/wordmark-light.svg",
  } as const;

  return (
    <BrandImage
      src={srcMap[variant]}
      alt={alt}
      className={className}
      height={height}
    />
  );
}

export function LoginBrand({
  variant = "dark",
  height = 34,
  className,
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
    <BrandImage
      src={src}
      alt="Corelix"
      className={className}
      height={height}
    />
  );
}

export function BrandLogoDarkBg({
  height = 46,
  className,
  alt = "Corelix",
}: {
  height?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <BrandImage
      src="/brand/wordmark-gradient.svg"
      alt={alt}
      className={className}
      height={height}
    />
  );
}

export function BrandIconDarkBg({
  size = 40,
  className,
  alt = "Corelix",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <BrandImage
      src="/brand/icon.svg"
      alt={alt}
      className={className}
      height={size}
      width={size}
    />
  );
}
