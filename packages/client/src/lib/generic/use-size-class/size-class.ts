// compact <600, medium 600–1099, wide ≥1100 by window width (tooling/uniwind/theme.css).
export type SizeClass = 'compact' | 'medium' | 'wide';

export interface SizeClassInput {
  // The window reaches --breakpoint-medium.
  medium: boolean;
  // The window reaches --breakpoint-wide.
  wide: boolean;
  // A native phone, which stays compact even in landscape.
  phone: boolean;
}

const byWidth = (input: SizeClassInput): SizeClass => {
  if (!input.medium) return 'compact';

  return input.wide ? 'wide' : 'medium';
};

export function sizeClass(input: SizeClassInput): SizeClass {
  return input.phone ? 'compact' : byWidth(input);
}
