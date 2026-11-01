import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { CodeField } from './code-field';

// App-only, so it has no Contracts schema for a props table to read.
const meta = {
  title: 'Design System/Primitives/Forms/CodeField',
  component: CodeField,
  tags: ['!autodocs'],
  args: {
    label: 'Code',
    value: '',
    length: 10,
    groupSize: 5,
    onChangeText: fn(),
  },
} satisfies Meta<typeof CodeField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const PartlyTyped: Story = { args: { value: '7KQ4M9' } };

export const Full: Story = { args: { value: '7KQ4M9XD2B' } };

export const Disabled: Story = { args: { value: '7KQ4M9', disabled: true } };
