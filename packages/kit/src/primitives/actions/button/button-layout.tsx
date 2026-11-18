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

const swiftLargeControl = createModifier('controlSize', { size: 'large' });

const swiftBorderless = createModifier('buttonStyle', { style: 'borderless' });

const phoneButtonMinHeight = 44;

const swiftFillWidth = createModifier('frame', { maxWidth: Infinity });

const swiftTextButtonFrame = createModifier('frame', {
  maxWidth: Infinity,
  minHeight: phoneButtonMinHeight,
});

// SwiftUI's plain style only hits drawn content unless the label supplies an interaction shape.
const swiftButtonHitArea = createModifier('contentShape', {
  shape: 'rectangle',
  kind: ['interaction', 'accessibility'],
});

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

const regularFullWidth = (props: ButtonProps): boolean =>
  props.fullWidth === true && (props.size ?? buttonDefaults.size) === 'md';

const textButton = (props: ButtonProps): boolean =>
  ['text', 'danger'].includes(variantOf(props));

function regularButtonControls(
  props: ButtonProps,
): NonNullable<ExpoButtonProps['modifiers']> {
  return textButton(props)
    ? [swiftLargeControl, swiftBorderless]
    : [swiftLargeControl];
}

export function nativeButtonModifiers(
  props: ButtonProps,
): NonNullable<ExpoButtonProps['modifiers']> {
  const size = sizes[props.size ?? buttonDefaults.size];

  const control = regularFullWidth(props)
    ? regularButtonControls(props)
    : size.modifiers;

  return [...control, ...widthOf(props).modifiers];
}

// A full-width text action's interaction area includes the clear space around its label.
export function buttonLabelModifiers(
  props: ButtonProps,
): NonNullable<ExpoButtonProps['modifiers']> {
  return regularFullWidth(props) && textButton(props)
    ? [swiftTextButtonFrame, swiftButtonHitArea]
    : [...widthOf(props).label];
}
