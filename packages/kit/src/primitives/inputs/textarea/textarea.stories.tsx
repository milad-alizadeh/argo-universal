import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Textarea } from './textarea';
import {
  emptyTextarea,
  filledTextarea,
  invalidTextarea,
  readOnlyTextarea,
} from './textarea-fixtures';

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

export const Invalid: Story = {
  render: (args): React.JSX.Element => (
    <Textarea {...args} {...invalidTextarea} />
  ),
};
