import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Textarea } from './textarea';
import type { TextareaProps } from './textarea-props';

const meta = {
  title: 'Design System/Primitives/Inputs/Textarea',
  component: Textarea,
  args: { placeholder: 'Message' },
  argTypes: kitArgTypes('Textarea'),
  tags: ['third-party'],
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { defaultValue: 'Hello.' } };

export const ReadOnly: Story = { args: { disabled: true } };

// React Native declares no invalid attribute, so the box reads the web one, outside the props type.
const invalid: TextareaProps & { 'aria-invalid'?: boolean } = {
  'aria-invalid': true,
};

export const Invalid: Story = {
  render: (args): React.JSX.Element => <Textarea {...args} {...invalid} />,
};
