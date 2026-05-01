export const BUSINESS_SEGMENTS = [
  "Cleaning company",
  "Retail store",
  "Online shop",
  "Fashion and tailoring",
  "Beauty and salon",
  "Food and bakery",
  "Electronics and repair",
  "Home services",
  "Pharmacy and health shop",
  "Wholesale and distribution",
] as const;

export type BusinessSegment = (typeof BUSINESS_SEGMENTS)[number];

export function isBusinessSegment(value: string): value is BusinessSegment {
  return BUSINESS_SEGMENTS.includes(value as BusinessSegment);
}

export const CLEANING_SEGMENT: BusinessSegment = "Cleaning company";

export function isCleaningSegment(
  segment: string | null | undefined,
): boolean {
  return segment === CLEANING_SEGMENT;
}
