import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Menu, type MenuAction } from './menu';
import {
  choices,
  disabledMenu,
  disabledOptionMenu,
  loadingMenu,
  type MenuFixture,
  type Permission,
} from './menu-fixtures';
import { ViewOptionsMenu } from './menu-groups.mocks';
import { MenuTrigger } from './menu-trigger';

type PermissionsMenuProps = MenuFixture;

function PermissionsMenu(props: PermissionsMenuProps): React.JSX.Element {
  const [value, setValue] = useState<Permission>('default');
  const disabled = props.disabled ?? false;

  return (
    <Menu
      accessibilityLabel="Options"
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

const meta = {
  title: 'Design System/Primitives/Overlays/Menu',
  component: Menu,
  /*
   * A menu keeps the value it was given, so each story draws a controlled example of its own and
   * these args only satisfy the component's type.
   */
  args: {
    accessibilityLabel: 'Options',
    value: 'default',
    options: choices,
    onValueChange: (): void => {},
    trigger: 'Options',
  },
  argTypes: kitArgTypes('Menu'),
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <PermissionsMenu /> };

export const Disabled: Story = {
  render: () => <PermissionsMenu {...disabledMenu} />,
};

export const DisabledOption: Story = {
  parameters: {
    docs: {
      description: {
        story: 'The third option is shown but cannot be chosen.',
      },
    },
  },
  render: () => <PermissionsMenu {...disabledOptionMenu} />,
};

export const Loading: Story = {
  render: () => <PermissionsMenu {...loadingMenu} />,
};

// Two headed groups of choices in one menu.
export const Groups: Story = { render: () => <ViewOptionsMenu /> };

export const ActionsOnATextTrigger: Story = { render: () => <RangeMenu /> };
