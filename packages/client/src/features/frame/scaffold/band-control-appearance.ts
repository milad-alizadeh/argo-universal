import type { IconButtonProps } from '@repo/kit/primitives/actions/icon-button';

// Paper's band controls share their size.
export const bandControlAppearance = {
  variant: 'ghost',
  size: 'sm',
} as const;

// Foundations / IconButton Off and On: the toggles stay ghost and take the IconButton's own selected state.
export function bandToggleAppearance(
  selected: boolean,
): Pick<IconButtonProps, 'selected' | 'size' | 'variant'> {
  return { ...bandControlAppearance, selected };
}
