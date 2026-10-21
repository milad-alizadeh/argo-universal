import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Textarea } from './textarea';
import {
  emptyTextarea,
  filledTextarea,
  readOnlyTextarea,
} from './textarea-fixtures';
import type { TextareaProps } from './textarea-props';

const meta = {
  title: 'Design System/Primitives/Inputs/Textarea',
  component: Textarea,
  args: emptyTextarea,
  argTypes: kitArgTypes('Textarea'),
  tags: ['third-party'],
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: emptyTextarea };

export const Filled: Story = { args: filledTextarea };

export const ReadOnly: Story = { args: readOnlyTextarea };

// React Native declares no invalid attribute, so the box reads the web one, outside the props type.
const invalid: TextareaProps & { 'aria-invalid'?: boolean } = {
  'aria-invalid': true,
};

export const Invalid: Story = {
  render: (args): React.JSX.Element => <Textarea {...args} {...invalid} />,
};
