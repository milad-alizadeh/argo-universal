import type { ReactNode } from 'react';

// One API on every platform: system Liquid Glass on iOS 26 and later, the caller's own surface everywhere else (ADR-0023).
export interface LiquidGlassProps {
  // A radius role: a container (a Surface or card), a sheet, or a pill (fully rounded, as a chip).
  corners: 'container' | 'sheet' | 'pill';
  // The surface drawn where the system has no Liquid Glass: earlier iOS, Android and the web.
  fallbackClassName: string;
  // Layout only (width, alignment, stacking), kept by both drawings.
  className?: string;
  // False draws the fallback surface even where glass is available.
  glass?: boolean;
  // Whether the glass answers touches, as a pressable chip does.
  interactive?: boolean;
  children: ReactNode;
}
