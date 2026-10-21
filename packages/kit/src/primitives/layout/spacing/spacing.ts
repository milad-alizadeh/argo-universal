import type { SpacingStep } from '@repo/contracts/kit-tokens';
import { useSpacing } from '#kit/use-spacing';

// Static classes, so Uniwind can see every one; the keys are the steps of the spacing scale.
export const gapClass = {
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
} as const satisfies Record<SpacingStep, string>;

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
} as const satisfies Record<SpacingStep, string>;

// A step's length in points, for layout that measures. Step 0, or a variable the theme has not loaded, reads as 0.
export function useSpacingStep(step: SpacingStep): number {
  const value = useSpacing(`--spacing-${step === 0 ? 1 : step}`);

  return step === 0 ? 0 : points(value);
}

function points(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
