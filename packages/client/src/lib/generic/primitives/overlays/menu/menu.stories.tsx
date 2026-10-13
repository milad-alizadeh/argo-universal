import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { Variation, Variations as VariationList } from '../../../variations';
import { Text } from '../../display/text/text';
import { Pressable, contentActionClass } from '../../pressable/pressable';
import { Menu } from './menu';

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
    </VariationList>
  ),
};
