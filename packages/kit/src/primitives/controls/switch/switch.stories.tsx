import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Switch } from './switch';
import {
  disabledSwitch,
  offSwitch,
  onSwitch,
  smallOffSwitch,
  smallOnSwitch,
} from './switch-fixtures';
import type { SwitchProps } from './switch-props';

// The on or off state is held by the caller, so each story toggles against local state.
function ControlledSwitch(props: SwitchProps): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  const onValueChange = (next: boolean): void => {
    setValue(next);
    props.onValueChange(next);
  };

  return <Switch {...props} value={value} onValueChange={onValueChange} />;
}

const meta = {
  title: 'Design System/Primitives/Controls/Switch',
  component: Switch,
  args: { onValueChange: fn() },
  argTypes: kitArgTypes('Switch'),
  tags: ['third-party'],
  render: (args): React.JSX.Element => <ControlledSwitch {...args} />,
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = { args: offSwitch };

export const On: Story = { args: onSwitch };

export const SmallOff: Story = { args: smallOffSwitch };

export const SmallOn: Story = { args: smallOnSwitch };

export const Disabled: Story = { args: disabledSwitch };
