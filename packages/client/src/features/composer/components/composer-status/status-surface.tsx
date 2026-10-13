import type { ReactNode, JSX } from 'react';
import { LiquidGlass } from '#lib/generic/primitives/display/liquid-glass/liquid-glass';
export const mutedTextClassName = 'text-muted-foreground';
export const unselectableTextClassName = 'select-none';
export const chipClassName =
  'h-full sm:h-full py-0 px-2.5 gap-1.5 rounded-full';
interface ChipSurfaceProps {
  glass?: boolean;
  children: ReactNode;
}
const chipSurfaceProps = {
  shape: 'capsule',
  interactive: true,
  className: 'h-6',
  fallbackClassName:
    'rounded-full border border-border bg-card shadow-composer',
} as const;
export function ChipSurface({
  glass,
  children,
}: ChipSurfaceProps): JSX.Element {
  return (
    <LiquidGlass {...chipSurfaceProps} glass={glass}>
      {children}
    </LiquidGlass>
  );
}
