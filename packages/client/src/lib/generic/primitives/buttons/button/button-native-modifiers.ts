import {
  fillMaxWidth,
  semantics,
  type ModifierConfig as ComposeModifier,
} from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityLabel,
  buttonStyle,
  controlSize,
  frame,
  tint,
  type ModifierConfig as SwiftModifier,
} from '@expo/ui/swift-ui/modifiers';
import { Platform } from 'react-native';
import { capsuleButtonBorder } from '#primitives/native/native-modifiers';
import type {
  ButtonDataProps,
  ButtonSize,
  ButtonVariant,
} from './button-props';
import { nativeButtonVariant } from './button-state';

// Expo UI's three button variants; SwiftUI and Compose have no tonal or link button in the universal set.
export type UniversalButtonVariant = 'filled' | 'outlined' | 'text';

const universalVariants = {
  default: 'filled',
  secondary: 'outlined',
  outline: 'outlined',
  ghost: 'text',
  link: 'text',
} as const satisfies Record<ButtonVariant, UniversalButtonVariant>;

export function universalButtonVariant(
  props: Pick<ButtonDataProps, 'variant' | 'tone'>,
): UniversalButtonVariant {
  return universalVariants[nativeButtonVariant(props)];
}

const controlSizes = {
  xs: 'small',
  sm: 'regular',
  md: 'large',
  lg: 'extraLarge',
} as const satisfies Record<ButtonSize, string>;

// `dangerColor` is the danger token, set only for the danger tone: the one colour a button takes besides the Host's.
type ModifierProps = Pick<
  ButtonDataProps,
  'tone' | 'variant' | 'size' | 'label' | 'accessibilityLabel' | 'fullWidth'
> & { dangerColor?: string };

export function nativeButtonModifiers(
  props: ModifierProps,
): (SwiftModifier | ComposeModifier)[] {
  return Platform.OS === 'ios'
    ? swiftModifiers(props)
    : composeModifiers(props);
}

// The label row fills a full-width SwiftUI button; Compose fills the button itself.
export function nativeLabelModifiers(
  props: Pick<ButtonDataProps, 'fullWidth'>,
): SwiftModifier[] {
  return Platform.OS === 'ios' && props.fullWidth === true
    ? [frame({ maxWidth: Infinity })]
    : [];
}

function swiftModifiers(props: ModifierProps): SwiftModifier[] {
  return [
    ...swiftTextStyle(props),
    capsuleButtonBorder(),
    controlSize(controlSizes[props.size ?? 'md']),
    frame({ minWidth: 44, minHeight: 44 }),
    accessibilityLabel(props.accessibilityLabel ?? props.label),
    ...dangerTint(props.dangerColor),
  ];
}

function dangerTint(color: string | undefined): SwiftModifier[] {
  return color ? [tint(color)] : [];
}

// A plain SwiftUI button ignores the Host's tint; borderless draws the same text button in the accent.
function swiftTextStyle(
  props: Pick<ButtonDataProps, 'variant' | 'tone'>,
): SwiftModifier[] {
  return universalButtonVariant(props) === 'text'
    ? [buttonStyle('borderless')]
    : [];
}

function composeModifiers(props: ModifierProps): ComposeModifier[] {
  return [
    semantics({
      contentDescription: props.accessibilityLabel ?? props.label,
    }),
    ...(props.fullWidth === true ? [fillMaxWidth()] : []),
  ];
}
