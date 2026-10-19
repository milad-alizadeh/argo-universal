import { cn } from '#lib/generic/utils';
import type { LiquidGlassProps } from '#primitives/content/liquid-glass';
import { paddingClass } from '#primitives/layout/spacing';
import type { SurfaceProps } from './surface-props';

interface Treatment {
  radius: string;
  // The material where the platform draws it: the web, and iOS 26 glass.
  fill: string;
  // The opaque stand-in where it cannot: glass is a plain card on earlier iOS and Android.
  plainFill: string;
}

const treatments = {
  background: { radius: '', fill: 'bg-content', plainFill: 'bg-content' },
  card: {
    radius: 'rounded-2xl',
    fill: 'bg-card dark:border dark:border-border',
    plainFill: 'bg-card dark:border dark:border-border',
  },
  muted: {
    radius: 'rounded-xl',
    fill: 'bg-tray shadow-tray web:backdrop-blur-glass web:backdrop-saturate-180',
    plainFill: 'bg-tray shadow-tray',
  },
  glass: {
    radius: 'rounded-2xl',
    fill: 'bg-glass shadow-glass web:backdrop-blur-glass web:backdrop-saturate-180',
    plainFill: 'bg-card shadow-card',
  },
} satisfies Record<SurfaceProps['kind'], Treatment>;

// System glass takes a radius role, not a class: the same container radius as the glass treatment above.
export const glassCorners = 'container' satisfies LiquidGlassProps['corners'];

type Material = 'drawn' | 'plain';

export function surfaceClass(
  { kind, padding = 0 }: SurfaceProps,
  material: Material,
): string {
  const treatment = treatments[kind];
  const fill = material === 'drawn' ? treatment.fill : treatment.plainFill;

  return cn(treatment.radius, fill, paddingClass[padding]);
}

// The pressable layer inside a Surface: its corners and padding, with the press tint.
export function pressClass({ kind, padding = 0 }: SurfaceProps): string {
  return cn(
    'overflow-hidden web:hover:bg-hover web:active:bg-pressed ios:active:bg-pressed',
    treatments[kind].radius,
    paddingClass[padding],
  );
}

export function contentPadding({ padding = 0 }: SurfaceProps): string {
  return paddingClass[padding];
}
