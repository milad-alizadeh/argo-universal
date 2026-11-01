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
    length: 10,
    groupSize: 5,
    onChangeText: fn(),
  },
  render: (args): React.JSX.Element => <Typing {...args} />,
} satisfies Meta<typeof CodeField>;

export default meta;

type Story = StoryObj<typeof meta>;

// Case, spaces and a dash are not part of the code, so a code read aloud lands as its characters.
export const KeepsOnlyTheCharacters: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText('Code');

    await userEvent.type(field, '7kq4m-9xd 2b');
    await expect(field).toHaveValue('7KQ4M9XD2B');
  },
};

// A paste longer than the code fills the code and no more.
export const StopsAtTheLength: Story = {
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText('Code');

    await userEvent.type(field, '7KQ4M9XD2BZZZ');
    await expect(field).toHaveValue('7KQ4M9XD2B');
  },
};

// A disabled field takes nothing.
export const DisabledTakesNothing: Story = {
  args: { disabled: true },
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByLabelText('Code');

    await userEvent.type(field, '7KQ');
    await expect(field).toHaveValue('');
  },
};
