import type { ButtonProps as ExpoButtonProps } from '@expo/ui';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import type { IconButtonSize } from '@repo/contracts/kit-tokens';
import type { IconSize } from '../../../symbols/icon-size';

type Modifiers = NonNullable<ExpoButtonProps['modifiers']>;

// Material 3's extra small, small and medium icon buttons: the box round the glyph, and the `Icon` size table's step Material draws in it.
const androidBoxes = {
  sm: { box: 32, glyph: 'sm' },
  md: { box: 40, glyph: 'md' },
  lg: { box: 56, glyph: 'md' },
} as const satisfies Record<IconButtonSize, { box: number; glyph: IconSize }>;

export const androidGlyphOf = (name: IconButtonSize): IconSize =>
  androidBoxes[name].glyph;

export const androidModifiersOf = (name: IconButtonSize): Modifiers => {
  const { box } = androidBoxes[name];

  return [size(box, box)];
};
