import { createContext } from 'react';
import type { LiquidGlassProps } from './liquid-glass-props';

export const LiquidGlassMaterial = createContext(false);

export const glassCornerClass = {
  container: 'rounded-2xl',
  sheet: 'rounded-sheet',
  pill: 'rounded-full',
} as const;

// The fallback's fill and edge; the web's glass also frosts what lies behind it.
const fallbackFill = 'bg-card shadow-card web:bg-glass web:shadow-glass';

const frostedFallback = `${fallbackFill} web:backdrop-blur-glass web:backdrop-saturate-180`;

// The shared fallback frosts unless its caller says not to.
const sharedFallback = (frosted = true): string =>
  frosted ? frostedFallback : fallbackFill;

// A caller's own fallback wins over the shared one.
export const fallbackSurfaceClass = (
  look: Pick<LiquidGlassProps, 'fallbackClassName' | 'frosted'>,
): string => look.fallbackClassName ?? sharedFallback(look.frosted);
