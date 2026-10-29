import type { ReactNode } from 'react';

// System Liquid Glass where available; one shared fallback elsewhere (ADR-0023).
export interface LiquidGlassProps {
  // A radius role: a container (a Surface or card), a sheet, or a pill (fully rounded, as a chip).
  corners: 'container' | 'sheet' | 'pill';
  // Overrides the shared fallback on platforms without system Liquid Glass.
  fallbackClassName?: string;
  // Layout only (width, alignment, stacking), kept by both drawings.
  className?: string;
  // False draws the fallback surface even where glass is available.
  glass?: boolean;
  // Whether the glass answers touches, as a pressable chip does.
  interactive?: boolean;
  // Inherits a parent material on native and fallback paths without another effect.
  inherit?: boolean;
  children: ReactNode;
}
