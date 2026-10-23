import type { ButtonProps as ExpoButtonProps } from '@expo/ui';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import type { controlSize } from '@expo/ui/swift-ui/modifiers';
import { iconButtonDefaults } from '@repo/contracts/kit-tokens';
import type { IconSize } from '../../../symbols/icon-size';
import type { IconButtonProps } from './icon-button';

type IconButtonSize = NonNullable<IconButtonProps['size']>;

type Modifiers = NonNullable<ExpoButtonProps['modifiers']>;

type ControlSize = Parameters<typeof controlSize>[0];

// The box round the glyph; the glyph is the same size step on `Icon` (the icon size table).
const extraSmallBox = 24;

const smallBox = 32;

const mediumBox = 40;

const largeBox = 48;

const composeSize = (box: number): Modifiers[number] => size(box, box);

export const sizes = {
  xs: {
    iconSize: 'xs',
    iosControlSize: 'mini',
    androidModifiers: [composeSize(extraSmallBox)],
    webClass: 'size-6',
  },
  sm: {
    iconSize: 'sm',
    iosControlSize: 'small',
    androidModifiers: [composeSize(smallBox)],
    webClass: 'size-8',
  },
  md: {
    iconSize: 'md',
    iosControlSize: 'regular',
    androidModifiers: [composeSize(mediumBox)],
    webClass: 'size-10',
  },
  lg: {
    iconSize: 'lg',
    iosControlSize: 'large',
    androidModifiers: [composeSize(largeBox)],
    webClass: 'size-12',
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
