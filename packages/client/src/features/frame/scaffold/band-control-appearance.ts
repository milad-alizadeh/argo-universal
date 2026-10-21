import type { IconButtonProps } from '@repo/kit/primitives/actions/icon-button';

// Paper's band controls share their box, glyph role and corners.
export const bandControlAppearance = {
  variant: 'ghost',
  size: '2xs',
  iconRole: 'band',
  corners: 'control',
} as const;

// Foundations / IconButton Off and On: only the band's toggles take the filled On state.
export function bandToggleAppearance(
  selected: boolean,
): Pick<
  IconButtonProps,
  'size' | 'variant' | 'iconRole' | 'corners' | 'selected' | 'iconTone'
> {
  return {
    ...bandControlAppearance,
    selected,
    variant: selected ? 'filled' : 'ghost',
    iconTone: selected ? undefined : 'muted',
  };
}
