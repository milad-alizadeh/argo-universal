import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { SegmentedControl } from './segmented-control';
import { defaultSegmentedControl } from './segmented-control-fixtures';
import type { SegmentedControlProps } from './segmented-control-props';

// The selected segment is held by the caller, so the stories press against local state.
function ControlledSegmentedControl(
  props: SegmentedControlProps,
): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  const onValueChange = (next: string): void => {
    setValue(next);
    props.onValueChange(next);
  };

  return (
    <SegmentedControl {...props} value={value} onValueChange={onValueChange} />
  );
}

const meta = {
  title: 'Design System/Primitives/Inputs/SegmentedControl',
  component: SegmentedControl,
  args: { onValueChange: fn() },
  // SegmentedControl has no Contracts schema, so its props are listed here.
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    options: { control: false },
    onValueChange: { control: false },
  },
  render: (args): React.JSX.Element => <ControlledSegmentedControl {...args} />,
} satisfies Meta<typeof SegmentedControl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: defaultSegmentedControl };
