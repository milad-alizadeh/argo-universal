import { stackAlignments, type StackGap } from '@repo/contracts/kit-tokens';
import type { ReactNode } from 'react';

// Static classes, so Uniwind can see every one; the keys are the spacing steps a stack accepts.
export const stackGapClass = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
} as const satisfies Record<StackGap, string>;

export type { StackGap } from '@repo/contracts/kit-tokens';

export { isStackGap } from '@repo/contracts/kit-tokens';

export { stackAlignments };

export interface StackProps {
  direction: 'row' | 'column';
  gap?: StackGap;
  align?: (typeof stackAlignments)[number];
  children?: ReactNode;
}
