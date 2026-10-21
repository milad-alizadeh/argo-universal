import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List, ListSection } from '#primitives/lists/list';
import { DatePicker } from './date-picker';
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
  args: {
    label: 'Due date',
    value: '2026-10-19',
    onValueChange: (): void => {},
  },
  argTypes: kitArgTypes('DatePicker'),
  parameters: { screenPreview: true },
  // A grouped section keeps the picker in the row it sits in on a settings screen.
  decorators: [
    (Story): React.JSX.Element => (
      <List appearance="grouped">
        <ListSection>
          <Story />
        </ListSection>
      </List>
    ),
  ],
  render: (args): React.JSX.Element => <Example {...args} />,
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

// Named for the default mode, since `Date` cannot be a module-level name.
export const Default: Story = {
  name: 'Date',
};

export const Time: Story = {
  args: { label: 'Reminder', mode: 'time', value: '14:30' },
};

export const DateAndTime: Story = {
  args: { label: 'Due', mode: 'datetime', value: '2026-10-19T14:30' },
};

export const Empty: Story = { args: { value: undefined } };

export const Disabled: Story = { args: { disabled: true } };

export const Invalid: Story = {
  args: {
    value: '2026-10-18',
    errors: [{ message: 'Pick today or a later date.' }],
  },
};
