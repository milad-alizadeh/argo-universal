import { Switch } from '@repo/kit/primitives/inputs/switch';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ComponentProps, ReactElement } from 'react';
import { Platform } from 'react-native';

type SwitchListItemProps = Pick<
  ComponentProps<typeof ListItem>,
  'title' | 'leading' | 'disabled'
> & {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

// A list row with an on/off switch at its end. A phone's whole row toggles it; on the web the switch is the one control, named and in the tab order.
export function SwitchListItem(props: SwitchListItemProps): ReactElement {
  const { value, onValueChange, ...row } = props;
  const toggle = (): void => onValueChange(!value);

  const onPress = Platform.OS === 'web' ? undefined : toggle;

  return (
    <ListItem {...row} onPress={onPress} trailing={<RowSwitch {...props} />} />
  );
}

function RowSwitch(props: SwitchListItemProps): ReactElement {
  return (
    <Switch
      accessibilityLabel={props.title}
      disabled={props.disabled}
      value={props.value}
      onValueChange={props.onValueChange}
    />
  );
}
