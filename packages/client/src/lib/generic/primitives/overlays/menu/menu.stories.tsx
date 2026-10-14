import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { contentActionClass } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { Pressable } from '#primitives/pressable';
import { Variation, Variations as VariationList } from '../../../variations';
import { Menu, type MenuAction } from './menu';

const choices = [
  { value: 'default', label: 'Default' },
  { value: 'ask', label: 'Ask before changes' },
  { value: 'full', label: 'Full access' },
] as const;

type Permission = (typeof choices)[number]['value'];

type PermissionsMenuProps = { disabled?: boolean };

function PermissionsMenu({
  disabled = false,
}: PermissionsMenuProps): React.JSX.Element {
  const [value, setValue] = useState<Permission>('default');

  return (
    <Menu
      accessibilityLabel="Permissions"
      value={value}
      choices={choices}
      onValueChange={setValue}
      disabled={disabled}
      trigger={renderPermissionsTrigger(disabled, labelOf(value))}
    />
  );
}

function labelOf(value: Permission): string | undefined {
  return choices.find((choice) => choice.value === value)?.label;
}

function renderPermissionsTrigger(
  disabled: boolean,
  label: string | undefined,
): React.JSX.Element {
  return (
    <Pressable role="button" disabled={disabled} className={triggerClassName()}>
      <Text>{label}</Text>
    </Pressable>
  );
}

function triggerClassName(): string {
  return contentActionClass({
    variant: 'ghost',
    className: 'android:h-auto android:min-h-10',
  });
}

const ranges = ['Today', 'This week', 'This month'];

const moreRanges = `+${ranges.length - 1} more`;

// An action menu on the inline text trigger, beside the secondary text it changes.
function RangeMenu(): React.JSX.Element {
  const [shown, setShown] = useState(ranges[0]);

  return (
    <View className="flex-row items-center gap-1.5">
      <Text role="secondary">{shown}</Text>
      <Menu
        accessibilityLabel={moreRanges}
        trigger={moreRanges}
        align="start"
        actions={rangeActions(shown, setShown)}
      />
    </View>
  );
}

function rangeActions(
  shown: string | undefined,
  show: (range: string) => void,
): MenuAction[] {
  return ranges.map((range) => ({
    label: range,
    selected: range === shown,
    onSelect: () => show(range),
  }));
}

const meta = { title: 'Design System/Primitives/Menu' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Menu',
  render: () => (
    <VariationList>
      <Variation label="Permissions">
        <PermissionsMenu />
      </Variation>
      <Variation label="Disabled">
        <PermissionsMenu disabled />
      </Variation>
      <Variation label="Actions on a text trigger">
        <RangeMenu />
      </Variation>
    </VariationList>
  ),
};
