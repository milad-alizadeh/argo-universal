import type { AccessibilityState, PressableProps } from 'react-native';

// What every Argo-drawn pressable button sets for assistive tech: its role, and disabled and busy while it loads.

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
