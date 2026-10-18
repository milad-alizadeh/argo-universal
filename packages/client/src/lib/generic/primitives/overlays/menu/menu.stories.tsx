import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { Variation, Variations as VariationList } from '../../../variations';
import { Menu, type MenuAction } from './menu';
import { ViewOptionsMenu } from './menu-groups.mocks';
import { MenuTrigger } from './menu-trigger';

const choices = [
  { value: 'default', label: 'Default' },
  { value: 'ask', label: 'Ask before changes' },
  { value: 'full', label: 'Full access' },
] as const;

type Permission = (typeof choices)[number]['value'];

// Full access is shown but cannot be chosen, as when the Project does not allow it.
const limitedChoices = choices.map((choice) => ({
  ...choice,
  disabled: choice.value === 'full',
}));

type PermissionsMenuProps = {
  disabled?: boolean;
  loading?: boolean;
  options?: typeof limitedChoices;
};

function PermissionsMenu(props: PermissionsMenuProps): React.JSX.Element {
  const [value, setValue] = useState<Permission>('default');
  const disabled = props.disabled ?? false;

  return (
    <Menu
      accessibilityLabel="Permissions"
      value={value}
      options={props.options ?? choices}
      onValueChange={setValue}
      disabled={disabled}
      loading={props.loading}
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
  return <MenuTrigger label={label ?? ''} icon="rules" disabled={disabled} />;
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
    onPress: () => show(range),
  }));
}

const meta = { title: 'Design System/Primitives/Overlays/Menu' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const permissionStates: { label: string; props: PermissionsMenuProps }[] = [
  { label: 'Permissions', props: {} },
  { label: 'Disabled', props: { disabled: true } },
  { label: 'Disabled option', props: { options: limitedChoices } },
  { label: 'Loading', props: { loading: true } },
];

export const Variations: Story = {
  name: 'Menu',
  render: () => (
    <VariationList>
      {permissionStates.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <PermissionsMenu {...props} />
        </Variation>
      ))}
      <Variation label="Groups">
        <ViewOptionsMenu />
      </Variation>
      <Variation label="Actions on a text trigger">
        <RangeMenu />
      </Variation>
    </VariationList>
  ),
};
