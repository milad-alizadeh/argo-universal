import {
  type NativeMenuItem,
  nativeMenuItems,
} from '#primitives/overlays/menu';
import type { SplitButtonProps, SplitMenuItems } from './split-button-props';

// Everything a phone's native split draws, read from SplitButton's props; the menu rows are the kit Menu's.
export interface NativeSplit {
  // The primary action: the acting button's name and press.
  acting: Pick<SplitButtonProps, 'label' | 'onPress'>;
  items: NativeMenuItem[];
  menuLabel: string;
  primary: boolean;
  enabled: boolean;
  size?: SplitButtonProps['size'];
}

export function nativeSplit<Value extends string>(
  props: SplitButtonProps<Value>,
): NativeSplit {
  return {
    acting: { label: props.label, onPress: props.onPress },
    items: nativeMenuItems(menuRows(props)),
    menuLabel: props.menuLabel,
    primary: props.primary === true,
    // The native split is one control, on or off as a whole.
    enabled: !props.disabled,
    size: props.size,
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
