import { createContext } from 'react';

export const LiquidGlassMaterial = createContext(false);

export const glassCornerClass = {
  container: 'rounded-2xl',
  sheet: 'rounded-sheet',
  pill: 'rounded-full',
} as const;

export const floatingGlassFallback =
  'bg-card shadow-card web:bg-glass web:shadow-glass web:backdrop-blur-glass web:backdrop-saturate-180';
