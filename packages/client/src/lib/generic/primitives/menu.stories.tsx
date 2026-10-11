import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations } from '../variations';
import { Menu } from './menu';
import { Pressable, contentActionClass } from './pressable';
import { Text } from './text';

const choices = [
  { value: 'default', label: 'Default' },
  { value: 'ask', label: 'Ask before changes' },
  { value: 'full', label: 'Full access' },
] as const;
type Permission = (typeof choices)[number]['value'];

function PermissionsMenu({
  disabled = false,
}: {
  disabled?: boolean;
}): React.JSX.Element {
  const [value, setValue] = useState<Permission>('default');
  const selected = choices.find((choice) => choice.value === value);
  return (
    <Menu
      accessibilityLabel="Permissions"
      value={value}
      choices={choices}
      onValueChange={setValue}
      disabled={disabled}
      trigger={
        <Pressable
          role="button"
          disabled={disabled}
          className={contentActionClass({
            variant: 'ghost',
            className: 'android:h-auto android:min-h-10',
          })}
        >
          <Text>{selected?.label}</Text>
        </Pressable>
      }
    />
  );
}

const meta = { title: 'Design System/Primitives/Menu' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'Menu',
  render: () => (
    <Variations>
      <Variation label="Permissions">
        <PermissionsMenu />
      </Variation>
      <Variation label="Disabled">
        <PermissionsMenu disabled />
      </Variation>
    </Variations>
  ),
};
