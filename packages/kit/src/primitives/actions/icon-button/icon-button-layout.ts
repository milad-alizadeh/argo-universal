import type { ButtonProps as ExpoButtonProps } from '@expo/ui';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import type { controlSize } from '@expo/ui/swift-ui/modifiers';
import { iconButtonDefaults } from '@repo/contracts/kit-tokens';
import type { IconSize } from '../../../symbols/icon-size';
import type { IconButtonProps } from './icon-button';

type IconButtonSize = NonNullable<IconButtonProps['size']>;

type Modifiers = NonNullable<ExpoButtonProps['modifiers']>;

type ControlSize = Parameters<typeof controlSize>[0];

// Material 3's extra small, small and medium icon buttons: the box round the glyph on Android.
const androidBoxes = { sm: 32, md: 40, lg: 56 } as const;

const composeSize = (box: number): Modifiers[number] => size(box, box);

/*
 * Each size is one of the platform's own steps. SwiftUI draws mini as small and extra large as large, so iOS takes
 * small, regular and large. The web's medium button keeps the small glyph, as the desktop header's buttons draw it;
 * Android takes Material 3's glyph for each box. The glyph is the `Icon` size table's step.
 */
export const sizes = {
  sm: {
    iconSize: 'sm',
    iosControlSize: 'small',
    androidIconSize: 'sm',
    androidModifiers: [composeSize(androidBoxes.sm)],
    webClass: 'size-6',
  },
  md: {
    iconSize: 'sm',
    iosControlSize: 'regular',
    androidIconSize: 'md',
    androidModifiers: [composeSize(androidBoxes.md)],
    webClass: 'size-8',
  },
  lg: {
    iconSize: 'md',
    iosControlSize: 'large',
    androidIconSize: 'md',
    androidModifiers: [composeSize(androidBoxes.lg)],
    webClass: 'size-10',
  },
} satisfies Record<
  IconButtonSize,
  {
    iconSize: IconSize;
    iosControlSize: ControlSize;
    androidIconSize: IconSize;
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
