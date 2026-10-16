import type { SplitActionProps, SplitMenuProps } from './split-button-props';

// The acting button as the native split draws it: its name, press and state.
export interface ActingButton {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

// The acting button's name comes from its label, or its text when it draws text as children.
export function actingButton(props: SplitActionProps): ActingButton {
  return {
    label: props.label ?? textOf(props.children),
    onPress: props.onPress,
    disabled: props.disabled,
  };
}

function textOf(children: SplitActionProps['children']): string {
  return typeof children === 'string' ? children : '';
}

// The native split is one control: it turns off when the split or its button is disabled.
export function splitEnabled(
  props: Pick<SplitMenuProps, 'disabled'>,
  acting: ActingButton,
): boolean {
  return !props.disabled && !acting.disabled;
}
