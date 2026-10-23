import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FieldGroup } from '#primitives/fields/field-group';
import { ControlledDatePicker } from './field-date-picker-controlled';
import {
  dateAndTime,
  dateOnly,
  disabledDate,
  timeOnly,
  unset,
} from './field-date-picker-fixtures';

// A row's stories draw it as the one row of a FieldGroup section, where Expo UI draws it.
const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Design System/Primitives/Forms/FieldDatePicker',
  component: ControlledDatePicker,
  args: { onValueChange: fn() },
  argTypes: kitArgTypes('FieldGroup.DatePicker'),
  parameters: { screenPreview: true },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof ControlledDatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

// Named for the default mode, since `Date` cannot be a module-level name.
export const Default: Story = { args: dateOnly, name: 'Date' };

export const Time: Story = { args: timeOnly };

export const DateAndTime: Story = { args: dateAndTime };

export const Empty: Story = { args: unset };

export const Disabled: Story = { args: disabledDate };
