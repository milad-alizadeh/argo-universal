import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { Switch } from '#primitives/inputs/switch';
import { ListItemFrame } from './list-item';
import type { ListItemProps } from './list-item-props';

export type ListItemToggleProps = Pick<
  ListItemProps,
  | 'title'
  | 'subtitle'
  | 'leading'
  | 'disabled'
  | 'accessibilityLabel'
  | 'testID'
> & {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function ToggleAccessory(props: ListItemToggleProps): ReactElement {
  const web = Platform.OS === 'web';

  return (
    <View pointerEvents={web ? 'none' : undefined} aria-hidden={web}>
      <Switch
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? props.title}
        decorative={web}
      />
    </View>
  );
}

export function ListItemToggle(props: ListItemToggleProps): ReactElement {
  const { value, onValueChange, ...row } = props;

  return (
    <ListItemFrame
      {...row}
      checked={Platform.OS === 'web' ? value : undefined}
      onPress={() => onValueChange(!value)}
      accessory={<ToggleAccessory {...props} />}
    />
  );
}
