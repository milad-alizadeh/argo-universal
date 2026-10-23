import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn, within } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ControlledPicker } from './field-picker-controlled';
import { inStackedToolbar } from './field-picker-decorators';
import { pill } from './field-picker-fixtures';
import { FieldPicker } from './field-picker-switch';

const meta = {
  title: 'Design System/Primitives/Forms/FieldPicker/Pill',
  component: FieldPicker,
  argTypes: kitArgTypes('FieldGroup.Picker'),
  decorators: inStackedToolbar,
} satisfies Meta<typeof FieldPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

// The pill sits in a toolbar, outside a FieldGroup; it opens the searchable page, already open here.
export const Pill: Story = {
  args: { ...pill, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
  play: async ({ canvasElement, userEvent }) => {
    await userEvent.click(
      await within(canvasElement).findByRole('button', { name: /^Label/ }),
    );
  },
};
