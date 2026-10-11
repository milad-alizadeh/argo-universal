import {
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  controlSize,
  disabled,
  frame,
  tint,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { PlatformColor } from 'react-native';
import type {
  ButtonDataProps,
  ButtonSize,
  ButtonVariant,
} from './button-props';
import { isButtonDisabled, nativeButtonVariant } from './button-state';

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

export function nativeModifiers(
  props: ModifierProps,
  primary: string | undefined,
): ModifierConfig[] {
  return [
    ...buttonStyleModifiers(props),
    ...buttonAccessibility(props),
    ...buttonTint(props, primary),
  ];
}

function buttonStyleModifiers(
  props: Pick<
    ButtonDataProps,
    'role' | 'variant' | 'size' | 'disabled' | 'loading'
  >,
): ModifierConfig[] {
  return [
    buttonStyle(buttonStyles[nativeButtonVariant(props)]),
    controlSize(controlSizes[props.size ?? 'md']),
    frame({ minWidth: 44, minHeight: 44 }),
    disabled(isButtonDisabled(props)),
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
  props: Pick<ButtonDataProps, 'role'>,
  primary: string | undefined,
): ModifierConfig[] {
  if (props.role === 'destructive') return [tint(PlatformColor('systemRed'))];
  if (primary === undefined) return [];
  return [tint(primary)];
}
