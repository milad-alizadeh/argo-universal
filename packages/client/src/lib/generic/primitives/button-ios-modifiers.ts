import {
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  controlSize,
  disabled,
  frame,
  strokeBorder,
  tint,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { PlatformColor } from 'react-native';
import type { ButtonTheme } from './button-native-colors';
import type {
  ButtonDataProps,
  ButtonSize,
  ButtonVariant,
} from './button-props';
import { nativeButtonVariant } from './button-state';

type ModifierProps = Pick<
  ButtonDataProps,
  | 'role'
  | 'variant'
  | 'size'
  | 'disabled'
  | 'loading'
  | 'label'
  | 'accessibilityLabel'
>;

const buttonStyles = {
  default: 'borderedProminent',
  outline: 'bordered',
  secondary: 'bordered',
  ghost: 'plain',
  link: 'plain',
} as const satisfies Record<ButtonVariant, string>;
const controlSizes = {
  sm: 'regular',
  md: 'large',
  lg: 'extraLarge',
} as const satisfies Record<ButtonSize, string>;

type ModifierTheme = Pick<ButtonTheme, 'primary' | 'border'>;

export function nativeModifiers(
  props: ModifierProps,
  theme: ModifierTheme,
): ModifierConfig[] {
  return [
    ...buttonStyleModifiers(props),
    ...buttonAccessibility(props),
    ...buttonTint(props, theme),
  ];
}

function buttonStyleModifiers(
  props: Pick<ButtonDataProps, 'role' | 'variant' | 'size' | 'disabled'>,
): ModifierConfig[] {
  return [
    buttonStyle(buttonStyles[nativeButtonVariant(props)]),
    controlSize(controlSizes[props.size ?? 'md']),
    frame({ minWidth: 44, minHeight: 44 }),
    disabled(!!props.disabled),
  ];
}

function buttonAccessibility(
  props: Pick<ButtonDataProps, 'label' | 'accessibilityLabel' | 'loading'>,
): ModifierConfig[] {
  return [
    accessibilityLabel(props.accessibilityLabel ?? props.label),
    ...(props.loading ? [accessibilityValue('Loading')] : []),
  ];
}

function buttonTint(
  props: Pick<ButtonDataProps, 'role' | 'variant'>,
  theme: ModifierTheme,
): ModifierConfig[] {
  if (nativeButtonVariant(props) === 'outline') return outlineEdge(theme);
  return fillTint(props, theme);
}

function fillTint(
  props: Pick<ButtonDataProps, 'role'>,
  theme: ModifierTheme,
): ModifierConfig[] {
  if (props.role === 'destructive') return [tint(PlatformColor('systemRed'))];
  if (theme.primary === undefined) return [];
  return [tint(theme.primary)];
}

// SwiftUI has no outlined button: a bordered one with a clear fill, edged in Argo's border colour.
function outlineEdge(theme: ModifierTheme): ModifierConfig[] {
  return [
    tint('transparent'),
    strokeBorder({ content: theme.border, shape: 'capsule' }),
  ];
}
