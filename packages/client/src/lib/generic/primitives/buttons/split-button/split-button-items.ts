import type {
  SplitActionProps,
  SplitButtonProps,
  SplitMenuItems,
} from './split-button-props';

// One item of the native menu: a choice, selected when chosen, or an action.
export interface SplitMenuItem {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

// The acting button as the native split draws it: its name, press and state.
export interface ActingButton {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

// Everything a phone's native split draws, read from SplitButton's props.
export interface NativeSplit {
  acting: ActingButton;
  items: SplitMenuItem[];
  menuLabel: string;
  primary: boolean;
  enabled: boolean;
}

export function nativeSplit<Value extends string>({
  children,
  ...props
}: SplitButtonProps<Value>): NativeSplit {
  const acting = actingButton(children.props);

  return {
    acting,
    items: splitMenuItems(props),
    menuLabel: props.menuLabel,
    primary: props.primary === true,
    enabled: !props.disabled && !acting.disabled,
  };
}

// What the native menu lists: every option with the chosen one selected, or the actions as they are.
export function splitMenuItems<Value extends string>(
  props: SplitMenuItems<Value>,
): SplitMenuItem[] {
  if (props.actions) return [...props.actions];

  return props.options.map((choice) => ({
    label: choice.label,
    selected: choice.value === props.value,
    onPress: () => props.onValueChange(choice.value),
  }));
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
