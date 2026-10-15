import type { ReactElement } from 'react';
import { Platform, View, type ViewProps } from 'react-native';
import type { CheckboxProps } from './checkbox-props';

type AccessibilityProps = Pick<
  CheckboxProps,
  'label' | 'value' | 'disabled' | 'selection'
> & {
  description?: string;
  children: ReactElement;
};

// Compose's actionless disabled mark drops its checked and disabled semantics.
export function CheckboxAccessibility(props: AccessibilityProps): ReactElement {
  if (Platform.OS !== 'android' || !props.disabled) return props.children;

  return (
    <View {...disabledSemantics(props)}>
      <View importantForAccessibility="no-hide-descendants">
        {props.children}
      </View>
    </View>
  );
}

function disabledSemantics(
  props: Pick<
    AccessibilityProps,
    'label' | 'value' | 'selection' | 'description'
  >,
): ViewProps {
  return {
    accessible: true,
    accessibilityRole: props.selection === 'single' ? 'radio' : 'checkbox',
    accessibilityLabel: props.label,
    accessibilityHint: props.description,
    accessibilityState: { checked: props.value, disabled: true },
  };
}
