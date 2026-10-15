import {
  type NativeMenuItem,
  nativeMenuItems,
} from '#primitives/overlays/menu';
import {
  type ActingButton,
  actingButton,
  splitEnabled,
} from './split-button-acting';
import type { SplitButtonProps, SplitMenuItems } from './split-button-props';

// Everything a phone's native split draws, read from SplitButton's props; the menu rows are the kit Menu's.
export interface NativeSplit {
  acting: ActingButton;
  items: NativeMenuItem[];
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
    items: nativeMenuItems(menuRows(props)),
    menuLabel: props.menuLabel,
    primary: props.primary === true,
    enabled: splitEnabled(props, acting),
  };
}

// Only what the chevron offers, not the split's own look.
export function menuRows<Value extends string>(
  props: SplitMenuItems<Value>,
): SplitMenuItems<Value> {
  if (props.actions) return { actions: props.actions };
  const { options, value, onValueChange } = props;

  return { options, value, onValueChange };
}
