// Animation timing constants for consistent motion
export const TRANSITIONS = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  slower: "400ms",
} as const;

export const EASING = {
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  smooth: "cubic-bezier(0.4, 0, 0.6, 1)",
  snappy: "cubic-bezier(0.4, 0, 0.1, 1)",
} as const;

// Focus ring styles for accessibility
export const FOCUS_STYLES = {
  outline: "2px solid var(--brand-500)",
  outlineOffset: "2px",
  borderRadius: "8px",
} as const;
