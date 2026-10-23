import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ControlledPicker } from './field-picker-controlled';
import { pill } from './field-picker-fixtures';
import { FieldPicker } from './field-picker-switch';

const meta = {
  title: 'Design System/Primitives/Fields/FieldPicker/Pill',
  component: FieldPicker,
  argTypes: kitArgTypes('FieldGroup.Picker'),
} satisfies Meta<typeof FieldPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

// The pill sits in a toolbar, outside a FieldGroup; it opens the searchable page.
export const Pill: Story = {
  args: { ...pill, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
};
