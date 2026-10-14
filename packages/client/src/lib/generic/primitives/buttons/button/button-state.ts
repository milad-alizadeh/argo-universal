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

// Paper and Material 3 draw a disabled button as the enabled one at this opacity, label colours kept.
const disabledOpacity = 0.38;

interface ButtonLayoutStyle {
  width?: '100%';
  opacity?: number;
}

// The Host props that place a native button.
interface NativeButtonLayout {
  matchContents: { vertical: boolean; horizontal: boolean };
  ignoreSafeArea: 'all';
  style: ButtonLayoutStyle;
}

/*
 * A button sits in the page's own layout, so a hosted one near the screen's edge keeps its place.
 * The Host fades a disabled button as one layer. Each native view would fade on its own, letting the fill
 * show through the label, and the system's own disabled style greys the fill under a label kept white.
 */
export function nativeButtonLayout(
  props: Pick<ButtonDataProps, 'fullWidth' | 'disabled'>,
): NativeButtonLayout {
  return {
    matchContents: { vertical: true, horizontal: props.fullWidth !== true },
    ignoreSafeArea: 'all',
    style: layoutStyle(props),
  };
}

function layoutStyle(
  props: Pick<ButtonDataProps, 'fullWidth' | 'disabled'>,
): ButtonLayoutStyle {
  const style: ButtonLayoutStyle = {};

  if (props.fullWidth === true) style.width = '100%';

  if (props.disabled) style.opacity = disabledOpacity;

  return style;
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
