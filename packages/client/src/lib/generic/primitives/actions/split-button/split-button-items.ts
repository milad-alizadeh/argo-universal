import type { ReactNode } from 'react';
import { actionGroups } from '#primitives/actions/action-list';
import {
  type MenuAction,
  type NativeMenuItem,
  nativeMenuItems,
} from '#primitives/overlays/menu';
import type {
  SplitButtonProps,
  SplitMenuItems,
  SplitMenuRows,
} from './split-button-props';

// Everything a phone's native split draws, read from SplitButton's props; the menu rows are the kit Menu's.
export interface NativeSplit {
  // The primary action: the acting button's name and press.
  acting: Pick<SplitButtonProps, 'label' | 'accessibilityLabel' | 'onPress'>;
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
    acting: actingOf(props),
    items: nativeMenuItems<Value>(menuRows(props)),
    menuLabel: props.menuLabel,
    primary: props.primary === true,
    // The native split is one control, on or off as a whole.
    enabled: !props.disabled,
    size: props.size,
  };
}

const actingOf = ({
  label,
  accessibilityLabel,
  onPress,
}: NativeSplit['acting']): NativeSplit['acting'] => ({
  label,
  accessibilityLabel,
  onPress,
});

// Only what the chevron offers, not the split's own look.
export function menuRows<Value extends string>(
  props: SplitMenuItems<Value>,
): SplitMenuRows<Value> {
  if (!props.options) return { actions: menuActions(props) };
  const { options, value, onValueChange } = props;

  return { options, value, onValueChange };
}

function menuActions(props: {
  actions?: readonly MenuAction[];
  children?: ReactNode;
}): readonly MenuAction[] {
  return props.actions ?? declaredActions(props.children);
}

// A Plugin declares its menu entries as keyed Action children, as in ActionList.
function declaredActions(children: ReactNode): MenuAction[] {
  return actionGroups(children).flatMap((group) =>
    group.actions.map(({ id, label, icon, disabled, tone, onPress }) => ({
      id,
      label,
      icon,
      disabled,
      tone,
      onPress,
    })),
  );
}
