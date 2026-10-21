import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Checkbox, type CheckboxProps } from './checkbox';

// A Checkbox is controlled, so every story draws through a wrapper that keeps the value.
function Example({
  value: initial,
  ...props
}: CheckboxProps): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return <Checkbox {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: 'Design System/Primitives/Inputs/Checkbox',
  component: Checkbox,
  args: { label: 'Notify team', value: false, onValueChange: (): void => {} },
  argTypes: kitArgTypes('Checkbox'),
  render: (args): React.JSX.Element => <Example {...args} />,
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { value: true } };

export const Disabled: Story = { args: { value: true, disabled: true } };

export const Invalid: Story = {
  args: { errors: ['Confirm your choice'] },
};
