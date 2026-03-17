import { BrandIcon } from "@/components/Brand";

interface LogoProps {
  size?: number;
  variant?: "dark" | "light";
}

export function Logo({ size = 48 }: LogoProps) {
  return <BrandIcon size={size} />;
}
