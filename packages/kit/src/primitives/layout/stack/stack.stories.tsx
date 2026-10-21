import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Stack } from './stack';
import { columnStack, rowStack } from './stack-fixtures';

const meta = {
  title: 'Design System/Primitives/Layout/Stack',
  component: Stack,
  argTypes: kitArgTypes('Stack'),
} satisfies Meta<typeof Stack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Row: Story = { args: rowStack };

export const Column: Story = { args: columnStack };
