import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldPicker } from './field-picker';
import { ControlledPicker } from './field-picker-controlled';
import {
  chosen as chosenFixture,
  multiple as multipleFixture,
  multipleMenu as multipleMenuFixture,
  page as pageFixture,
  pageAction as pageActionFixture,
  pageSearchable as pageSearchableFixture,
} from './field-picker-fixtures';

// A row's stories draw it as the one row of a FieldGroup section, where Expo UI draws it.
const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Design System/Primitives/Fields/FieldPicker',
  component: FieldPicker,
  argTypes: kitArgTypes('FieldGroup.Picker'),
  parameters: { screenPreview: true },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

// A short known list opens in place.
export const Chosen: Story = {
  args: { ...chosenFixture, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
};

// A longer list opens on a page of rows with a mark on the chosen one.
export const Page: Story = {
  args: { ...pageFixture, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
};

// Forty options in two sections, a search field above them, as many as it takes to need one.
export const PageSearchable: Story = {
  args: { ...pageSearchableFixture, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
};

// The page's action sits in a place of its own below the choices.
export const PageAction: Story = {
  args: { ...pageActionFixture, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
};

// Several choices: the page stays open and each toggle reports the whole list.
export const Multiple: Story = {
  args: { ...multipleFixture, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
};

// A short several-of choice opens in place too.
export const MultipleMenu: Story = {
  args: { ...multipleMenuFixture, onValueChange: fn() },
  render: (args) => <ControlledPicker {...args} />,
};
