import type {
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldText } from './field-text';

// A row's stories draw it as the one row of a FieldGroup section, where Expo UI draws it.
const inFieldGroupSection: Decorator = (Story): React.JSX.Element => (
  <FieldGroup>
    <FieldGroup.Section title="Section">
      <Story />
    </FieldGroup.Section>
  </FieldGroup>
);

const meta = {
  title: 'Design System/Primitives/Forms/FieldText',
  component: FieldText,
  args: {
    title: 'Label',
    value: 'Value',
    placeholder: 'Placeholder',
    onChangeText: fn(),
  },
  argTypes: kitArgTypes('FieldGroup.TextField'),
  parameters: { screenPreview: true },
  decorators: [inFieldGroupSection],
} satisfies Meta<typeof FieldText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Filled: Story = {};

export const NumberKeyboard: Story = { args: { keyboardType: 'number-pad' } };

export const Secret: Story = { args: { secure: true } };

export const Empty: Story = { args: { value: '' } };

export const SecretEmpty: Story = { args: { value: '', secure: true } };

export const Multiline: Story = {
  args: {
    title: 'Notes',
    multiline: true,
    value:
      'A longer answer that wraps over several lines so the field grows with its text instead of scrolling inside one line.',
  },
};

export const SecretDisabled: Story = { args: { secure: true, disabled: true } };

export const SecretInvalid: Story = {
  args: { secure: true, error: 'Enter a valid value.' },
};
