import type { IconButtonProps } from '@repo/kit/primitives/actions/icon-button';

// Paper's band controls share their size.
export const bandControlAppearance = {
  variant: 'ghost',
  size: 'sm',
} as const;

// Foundations / IconButton Off and On: only the band's toggles take the filled On state.
export function bandToggleAppearance(
  selected: boolean,
): Pick<IconButtonProps, 'size' | 'variant'> {
  return {
    ...bandControlAppearance,
    variant: selected ? 'primary' : 'ghost',
  };
}
