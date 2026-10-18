import type { StackGap } from '@repo/contracts/kit-tokens';
import type { SurfaceProps } from './surface-props';

export const surfaceClass = {
  background: 'bg-content',
  card: 'bg-card dark:border dark:border-border',
  muted:
    'bg-tray shadow-tray web:backdrop-blur-glass web:backdrop-saturate-180',
  glass:
    'bg-glass shadow-glass web:backdrop-blur-glass web:backdrop-saturate-180',
} satisfies Record<SurfaceProps['kind'], string>;

export const paddingClass = {
  0: 'p-0',
  1: 'p-1',
  2: 'p-2',
  3: 'p-3',
  4: 'p-4',
  5: 'p-5',
  6: 'p-6',
  8: 'p-8',
  10: 'p-10',
  12: 'p-12',
} satisfies Record<StackGap, string>;

export const cornerClass = {
  background: '',
  card: 'rounded-2xl',
  muted: 'rounded-xl',
  glass: 'rounded-2xl',
} satisfies Record<SurfaceProps['kind'], string>;
