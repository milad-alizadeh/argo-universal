import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Switch, type SwitchProps } from './switch';

// The value is held by the caller, so the switch flips against local state.
function ControlledSwitch(props: SwitchProps): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  return (
    <Switch
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValueChange(next);
      }}
    />
  );
}

const meta = {
  title: 'Design System/Primitives/Controls/Switch',
  component: Switch,
  args: { value: true, accessibilityLabel: 'Label', onValueChange: fn() },
  argTypes: kitArgTypes('Switch'),
  render: (args): React.JSX.Element => <ControlledSwitch {...args} />,
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const On: Story = {};

export const Off: Story = { args: { value: false } };

export const Disabled: Story = { args: { disabled: true } };
