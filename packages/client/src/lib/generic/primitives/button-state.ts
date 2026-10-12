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

// A loading button keeps its look but ignores presses, so the system never greys it out like a disabled one.
export function readyPress(
  props: Pick<ButtonDataProps, 'onPress' | 'disabled' | 'loading'>,
): ButtonDataProps['onPress'] {
  return isButtonDisabled(props) ? undefined : props.onPress;
}

// A button sits in the page's own layout, so a hosted one near the screen's edge keeps its place.
export function nativeButtonLayout(fullWidth?: boolean): {
  matchContents: { vertical: boolean; horizontal: boolean };
  ignoreSafeArea: 'all';
  style: { width: '100%' } | undefined;
} {
  return {
    matchContents: { vertical: true, horizontal: !fullWidth },
    ignoreSafeArea: 'all',
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
