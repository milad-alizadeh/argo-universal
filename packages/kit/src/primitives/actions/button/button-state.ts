import type { AccessibilityState, PressableProps } from 'react-native';
import type { ButtonDataProps, ButtonVariant } from './button-props';

export function nativeButtonVariant(
  props: Pick<ButtonDataProps, 'variant' | 'tone'>,
): ButtonVariant {
  return props.variant ?? (props.tone === 'danger' ? 'ghost' : 'default');
}

export function isButtonDisabled(
  props: Pick<ButtonDataProps, 'disabled' | 'loading'>,
): boolean {
  return !!(props.disabled || props.loading);
}

interface ButtonLayoutStyle {
  width?: '100%';
}

// The Host props that place a native button.
interface NativeButtonLayout {
  matchContents: { vertical: boolean; horizontal: boolean };
  ignoreSafeArea: 'all';
  style: ButtonLayoutStyle;
}

// A button sits in the page's own layout, so a hosted one near the screen's edge keeps its place.
export function nativeButtonLayout(
  props: Pick<ButtonDataProps, 'fullWidth'>,
): NativeButtonLayout {
  return {
    matchContents: { vertical: true, horizontal: props.fullWidth !== true },
    ignoreSafeArea: 'all',
    style: layoutStyle(props),
  };
}

function layoutStyle(
  props: Pick<ButtonDataProps, 'fullWidth'>,
): ButtonLayoutStyle {
  return props.fullWidth === true ? { width: '100%' } : {};
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
