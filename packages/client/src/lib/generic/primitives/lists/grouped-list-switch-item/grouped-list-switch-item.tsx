import type * as React from 'react';
import { Platform, View } from 'react-native';
import { Switch } from '#primitives/inputs/switch';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import type { GroupedListSwitchItemProps } from './grouped-list-switch-item-props';

// A phone's row holds the system switch; the web's whole row is the switch, its drawing decorative.
export function GroupedListSwitchItem(
  props: GroupedListSwitchItemProps,
): React.JSX.Element {
  const { value, onValueChange, ...row } = props;

  if (Platform.OS !== 'web')
    return (
      <GroupedListItem
        {...row}
        disclosure={false}
        control={<RowSwitch {...props} />}
      />
    );

  // GroupedListItem reports `checked` as the switch's aria-checked on the web.
  return (
    <GroupedListItem
      {...row}
      accessibilityRole="switch"
      checked={value}
      disclosure={false}
      onPress={() => onValueChange(!value)}
      accessory={<DecorativeSwitch {...props} />}
    />
  );
}

function DecorativeSwitch(
  props: GroupedListSwitchItemProps,
): React.JSX.Element {
  return (
    <View
      className="pointer-events-none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    >
      <RowSwitch {...props} />
    </View>
  );
}

function RowSwitch({
  label,
  value,
  onValueChange,
  disabled,
}: GroupedListSwitchItemProps): React.JSX.Element {
  return (
    <Switch
      accessibilityLabel={label}
      decorative={Platform.OS === 'web'}
      disabled={disabled}
      value={value}
      onValueChange={onValueChange}
    />
  );
}
