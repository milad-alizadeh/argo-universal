import type { AccessibilityState, PressableProps } from 'react-native';
import type { ButtonDataProps, ButtonVariant } from './button-props';

export function nativeButtonVariant(
  props: Pick<ButtonDataProps, 'variant' | 'role'>,
): ButtonVariant {
  return props.variant ?? (props.role === 'destructive' ? 'ghost' : 'default');
}

export function isButtonDisabled(
  props: Pick<ButtonDataProps, 'disabled' | 'loading'>,
): boolean {
  return !!(props.disabled || props.loading);
}

export function nativeButtonLayout(fullWidth?: boolean): {
  matchContents: { vertical: boolean; horizontal: boolean };
  style: { width: '100%' } | undefined;
} {
  return {
    matchContents: { vertical: true, horizontal: !fullWidth },
    style: fullWidth ? { width: '100%' } : undefined,
  };
}

interface InteractionProps {
  disabled?: boolean | null;
  loading?: boolean;
  accessibilityState?: AccessibilityState;
}

type InteractionAttributes = Pick<
  PressableProps,
  'role' | 'disabled' | 'accessibilityState' | 'aria-busy'
>;

export function buttonInteractionProps(
  props: InteractionProps,
): InteractionAttributes {
  const disabled = !!(props.disabled || props.loading);
  return {
    role: 'button',
    disabled,
    'aria-busy': !!props.loading,
    accessibilityState: {
      ...props.accessibilityState,
      disabled,
      busy: !!props.loading,
    },
  };
}
