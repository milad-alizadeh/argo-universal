import { type ButtonProps as ExpoButtonProps, Spacer } from '@expo/ui';
import {
  createModifier,
  fillMaxWidth,
} from '@expo/ui/jetpack-compose/modifiers';
import { buttonDefaults } from '@repo/contracts/kit-tokens';
import type { IconSize } from '../../../symbols/icon-size';
import type { ButtonProps } from './button';

type ButtonSize = NonNullable<ButtonProps['size']>;

/*
 * SwiftUI's controlSize and frame, built with Expo's plain modifier factory: `@expo/ui/swift-ui/modifiers`
 * loads the ExpoUI native module on import, which the web lacks. Compose ignores both.
 */
const swiftControlSize = createModifier('controlSize', { size: 'small' });

const swiftFillWidth = createModifier('frame', { maxWidth: Infinity });

const smallHeight = 32;

export const sizes = {
  sm: {
    modifiers: [swiftControlSize],
    style: { height: smallHeight },
    iconSize: 'sm',
  },
  md: { modifiers: [], style: {}, iconSize: 'sm' },
} satisfies Record<
  ButtonSize,
  Required<Pick<ExpoButtonProps, 'modifiers' | 'style'>> & {
    iconSize: IconSize;
  }
>;

/*
 * Compose fills on the Button; SwiftUI draws its capsule round the label, so the label takes the frame;
 * flexible Spacers centre the label, which the web's Row would otherwise start-align.
 */
export const widths = {
  true: {
    host: { matchContents: { vertical: true }, style: { width: '100%' } },
    modifiers: [fillMaxWidth()],
    label: [swiftFillWidth],
    edge: <Spacer flexible />,
  },
  false: {
    host: { matchContents: true },
    modifiers: [],
    label: [],
    edge: null,
  },
} as const;

export const variantOf = (
  props: ButtonProps,
): NonNullable<ButtonProps['variant']> =>
  props.variant ?? buttonDefaults.variant;

export const widthOf = (
  props: ButtonProps,
): (typeof widths)[keyof typeof widths] =>
  widths[`${props.fullWidth === true}`];
