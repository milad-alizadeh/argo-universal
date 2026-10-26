import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { SegmentedControl } from './segmented-control';
import { ControlledSegmentedControl } from './segmented-control-controlled';
import {
  defaultSegmentedControl,
  disabledSegmentedControl,
} from './segmented-control-fixtures';

const meta = {
  title: 'Design System/Primitives/Controls/SegmentedControl',
  component: SegmentedControl,
  args: { onValueChange: fn() },
  argTypes: kitArgTypes('SegmentedControl'),
  render: (args): React.JSX.Element => <ControlledSegmentedControl {...args} />,
} satisfies Meta<typeof SegmentedControl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: defaultSegmentedControl };

export const Disabled: Story = { args: disabledSegmentedControl };
