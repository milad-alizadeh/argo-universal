import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { DatePicker } from './date-picker';
import {
  dateAndTimeDatePicker,
  defaultDatePicker,
  disabledDatePicker,
  emptyDatePicker,
  invalidDatePicker,
  timeDatePicker,
} from './date-picker-fixtures';
import type { DatePickerProps } from './date-picker-props';

// A DatePicker is controlled, so every story draws through a wrapper that keeps the picked value.
function Example({
  value: initial,
  ...props
}: DatePickerProps): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return <DatePicker {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: 'Design System/Primitives/Inputs/DatePicker',
  component: DatePicker,
  args: { onValueChange: (): void => {} },
  argTypes: kitArgTypes('DatePicker'),
  parameters: { screenPreview: true },
  render: (args): React.JSX.Element => <Example {...args} />,
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

// Named for the default mode, since `Date` cannot be a module-level name.
export const Default: Story = {
  args: defaultDatePicker,
  name: 'Date',
};

export const Time: Story = {
  args: timeDatePicker,
};

export const DateAndTime: Story = {
  args: dateAndTimeDatePicker,
};

export const Empty: Story = { args: emptyDatePicker };

export const Disabled: Story = { args: disabledDatePicker };

export const Invalid: Story = { args: invalidDatePicker };
