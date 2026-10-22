import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fireEvent, fn } from 'storybook/test';
import { List, ListSection } from '#primitives/lists/list';
import { settleViewport } from '../../../settle-viewport';
import { DatePicker } from './date-picker';
import type { DatePickerProps } from './date-picker-props';

const LABEL = 'Due date';

const DAY = '2026-10-19';

const changed = fn<(value: string) => void>();

function Field(
  props: Omit<DatePickerProps, 'onValueChange' | 'label'>,
): React.JSX.Element {
  const [value, setValue] = useState(props.value);

  return (
    <List appearance="grouped">
      <ListSection>
        <DatePicker
          label={LABEL}
          {...props}
          value={value}
          onValueChange={(next) => {
            setValue(next);
            changed(next);
          }}
        />
      </ListSection>
    </List>
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Inputs/DatePicker',
  render: (): React.JSX.Element => <Field />,
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
    changed.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const PicksADate: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(LABEL);
    await expect(input).toHaveAttribute('type', 'date');
    await expect(input).toHaveValue('');
    await fireEvent.change(input, { target: { value: DAY } });
    await expect(changed).toHaveBeenCalledWith(DAY);
    await expect(input).toHaveValue(DAY);
  },
};

export const PicksATime: Story = {
  render: () => <Field mode="time" value="09:00" />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(LABEL);
    await expect(input).toHaveAttribute('type', 'time');
    await fireEvent.change(input, { target: { value: '14:30' } });
    await expect(changed).toHaveBeenCalledWith('14:30');
  },
};

export const PicksADateAndTime: Story = {
  render: () => <Field mode="datetime" />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(LABEL);
    await expect(input).toHaveAttribute('type', 'datetime-local');
    await fireEvent.change(input, { target: { value: '2026-10-19T14:30' } });
    await expect(changed).toHaveBeenCalledWith('2026-10-19T14:30');
  },
};

export const Disabled: Story = {
  render: () => <Field value="2026-10-19" disabled />,
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(LABEL);
    await expect(input).toBeDisabled();
    input.focus();
    await expect(input).not.toHaveFocus();
  },
};

export const Invalid: Story = {
  render: () => (
    <Field
      value="2026-10-18"
      required
      errors={[{ message: 'Error message' }]}
    />
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText(LABEL);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toBeRequired();
    await expect(input).toHaveAccessibleDescription('Error message');
  },
};
