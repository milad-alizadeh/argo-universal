import {
  accessibilityLabel,
  accessibilityValue,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  frame,
  tint,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { PlatformColor, type ColorValue } from 'react-native';
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

// Secondary and outlined draw the same muted capsule: SwiftUI has no outlined button.
const buttonStyles = {
  default: 'borderedProminent',
  outline: 'borderedProminent',
  secondary: 'borderedProminent',
  ghost: 'plain',
  link: 'plain',
} as const satisfies Record<ButtonVariant, string>;
const controlSizes = {
  xs: 'small',
  sm: 'regular',
  md: 'large',
  lg: 'extraLarge',
} as const satisfies Record<ButtonSize, string>;

type ModifierTheme = Pick<ButtonTheme, 'primary' | 'mutedFill' | 'colors'>;

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
  props: Pick<ButtonDataProps, 'role' | 'variant' | 'size'>,
): ModifierConfig[] {
  return [
    buttonStyle(buttonStyles[nativeButtonVariant(props)]),
    buttonBorderShape('capsule'),
    controlSize(controlSizes[props.size ?? 'md']),
    frame({ minWidth: 44, minHeight: 44 }),
  ];
}

function buttonAccessibility(
  props: Pick<
    ButtonDataProps,
    'label' | 'accessibilityLabel' | 'loading' | 'disabled'
  >,
): ModifierConfig[] {
  const value = accessibilityState(props);
  return [
    accessibilityLabel(props.accessibilityLabel ?? props.label),
    ...(value ? [accessibilityValue(value)] : []),
  ];
}

function accessibilityState(
  props: Pick<ButtonDataProps, 'loading' | 'disabled'>,
): string | undefined {
  if (props.loading) return 'Loading';
  return props.disabled ? 'Dimmed' : undefined;
}

function buttonTint(
  props: Pick<ButtonDataProps, 'role' | 'variant'>,
  theme: ModifierTheme,
): ModifierConfig[] {
  const fill = buttonFill(props, theme);
  return fill === undefined ? [] : [tint(fill)];
}

function buttonFill(
  props: Pick<ButtonDataProps, 'role' | 'variant'>,
  theme: ModifierTheme,
): ColorValue | undefined {
  const variant = nativeButtonVariant(props);
  if (buttonStyles[variant] !== 'borderedProminent') return theme.primary;
  if (variant === 'outline') return theme.mutedFill;
  return filledTint(props.role, theme);
}

function filledTint(
  role: ButtonDataProps['role'],
  theme: ModifierTheme,
): ColorValue | undefined {
  return role === 'destructive'
    ? PlatformColor('systemRed')
    : theme.colors.containerColor;
}
