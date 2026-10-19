import { cn } from '#lib/generic/utils';
import type { LiquidGlassProps } from '#primitives/content/liquid-glass';
import { paddingClass } from '#primitives/layout/spacing';
import type { SurfaceProps } from './surface-props';

const treatments = {
  background: { radius: '', fill: 'bg-content' },
  card: {
    radius: 'rounded-2xl',
    fill: 'bg-card dark:border dark:border-border',
  },
  muted: {
    radius: 'rounded-xl',
    fill: 'bg-tray shadow-tray web:backdrop-blur-glass web:backdrop-saturate-180',
  },
  glass: {
    radius: 'rounded-2xl',
    fill: 'bg-glass shadow-glass web:backdrop-blur-glass web:backdrop-saturate-180',
  },
} satisfies Record<SurfaceProps['kind'], { radius: string; fill: string }>;

// Where the platform cannot draw glass (earlier iOS, Android), a glass Surface is a plain card.
const plainGlassFill = 'bg-card shadow-card';

// System glass takes a radius role, not a class: the same container radius as the glass treatment above.
export const glassCorners = 'container' satisfies LiquidGlassProps['corners'];

type Material = 'drawn' | 'plain';

export function surfaceClass(
  { kind, padding = 0 }: SurfaceProps,
  material: Material,
): string {
  return cn(
    treatments[kind].radius,
    fillOf(kind, material),
    paddingClass[padding],
  );
}

function fillOf(kind: SurfaceProps['kind'], material: Material): string {
  if (material === 'plain' && kind === 'glass') return plainGlassFill;

  return treatments[kind].fill;
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
