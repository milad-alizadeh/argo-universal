import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { CodeField, type CodeFieldProps } from './code-field';

// The field is controlled, so the story holds what it was given.
function Typing(args: CodeFieldProps): React.JSX.Element {
  const [value, setValue] = useState(args.value);

  return <CodeField {...args} value={value} onChangeText={setValue} />;
}

const meta = {
  title: 'Tests/Design System/Primitives/Forms/CodeField',
  component: CodeField,
  args: {
    label: 'Code',
    value: '',
    length: 6,
    groupSize: 3,
    onChangeText: fn(),
  },
  render: (args): React.JSX.Element => <Typing {...args} />,
} satisfies Meta<typeof CodeField>;

export default meta;

type Story = StoryObj<typeof meta>;

// Spaces and a dash are not part of the code, so a code read aloud lands as its digits.
export const KeepsOnlyTheDigits: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText('Code');

    await userEvent.type(field, '482-9 15');
    await expect(field).toHaveValue('482915');
  },
};

// A paste longer than the code fills the code and no more; a letter is not a digit and lands nowhere.
export const StopsAtTheLength: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText('Code');

    await userEvent.type(field, '48291577');
    await expect(field).toHaveValue('482915');
  },
};

// A disabled field takes nothing.
export const DisabledTakesNothing: Story = {
  args: { disabled: true },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText('Code');

    await userEvent.type(field, '482');
    await expect(field).toHaveValue('');
  },
};
