import type { ButtonProps as ExpoButtonProps } from '@expo/ui';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import type { controlSize } from '@expo/ui/swift-ui/modifiers';
import { iconButtonDefaults } from '@repo/contracts/kit-tokens';
import type { IconSize } from '../../../symbols/icon-size';
import type { IconButtonProps } from './icon-button';

type IconButtonSize = NonNullable<IconButtonProps['size']>;

type Modifiers = NonNullable<ExpoButtonProps['modifiers']>;

type ControlSize = Parameters<typeof controlSize>[0];

// The box round the glyph on Android; iOS sizes the whole button by its control size.
const mediumBox = 32;

const largeBox = 40;

// Material 3's smallest icon button: a 20dp glyph needs a 32dp box.
const androidSmallBox = 32;

const composeSize = (box: number): Modifiers[number] => size(box, box);

/*
 * A medium button keeps the small glyph, as the desktop header's buttons draw it; the large button takes the medium
 * glyph. The glyph is the `Icon` size table's step.
 */
export const sizes = {
  sm: {
    iconSize: 'sm',
    iosControlSize: 'mini',
    androidModifiers: [composeSize(androidSmallBox)],
    webClass: 'size-6',
  },
  md: {
    iconSize: 'sm',
    iosControlSize: 'small',
    androidModifiers: [composeSize(mediumBox)],
    webClass: 'size-8',
  },
  lg: {
    iconSize: 'md',
    iosControlSize: 'regular',
    androidModifiers: [composeSize(largeBox)],
    webClass: 'size-10',
  },
} satisfies Record<
  IconButtonSize,
  {
    iconSize: IconSize;
    iosControlSize: ControlSize;
    androidModifiers: Modifiers;
    webClass: string;
  }
>;

export const variantOf = (
  props: IconButtonProps,
): NonNullable<IconButtonProps['variant']> =>
  props.variant ?? iconButtonDefaults.variant;

export const sizeOf = (
  props: IconButtonProps,
): (typeof sizes)[IconButtonSize] =>
  sizes[props.size ?? iconButtonDefaults.size];
