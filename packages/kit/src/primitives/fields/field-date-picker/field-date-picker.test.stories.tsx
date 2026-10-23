import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fireEvent, fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { ControlledDatePicker } from './field-date-picker-controlled';

const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const LABEL = 'Due date';

const FIRST = '2026-10-19';

const meta = {
  title: 'Tests/Design System/Primitives/Fields/FieldDatePicker',
  component: ControlledDatePicker,
  args: { title: LABEL, value: undefined, onValueChange: fn() },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof ControlledDatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PicksADate: Story = {
  play: async ({ canvas, args }) => {
    const input = canvas.getByLabelText(LABEL);
    await expect(input).toHaveAttribute('type', 'date');
    await fireEvent.change(input, { target: { value: FIRST } });
    await expect(args.onValueChange).toHaveBeenCalledWith(FIRST);
    await expect(input).toHaveValue(FIRST);
  },
};

export const PicksATime: Story = {
  args: { mode: 'time', value: '09:00' },
  play: async ({ canvas, args }) => {
    const input = canvas.getByLabelText(LABEL);
    await expect(input).toHaveAttribute('type', 'time');
    await fireEvent.change(input, { target: { value: '14:30' } });
    await expect(args.onValueChange).toHaveBeenCalledWith('14:30');
  },
};

export const PicksADateAndTime: Story = {
  args: { mode: 'datetime' },
  play: async ({ canvas, args }) => {
    const input = canvas.getByLabelText(LABEL);
    await expect(input).toHaveAttribute('type', 'datetime-local');
    await fireEvent.change(input, { target: { value: '2026-10-19T14:30' } });
    await expect(args.onValueChange).toHaveBeenCalledWith('2026-10-19T14:30');
  },
};

export const Disabled: Story = {
  args: { value: FIRST, disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText(LABEL)).toBeDisabled();
  },
};
