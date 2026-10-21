import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Stack } from './stack';

const pair = (
  <>
    <Text>One</Text>
    <Text>Two</Text>
  </>
);

const meta = {
  title: 'Design System/Primitives/Layout/Stack',
  component: Stack,
  argTypes: kitArgTypes('Stack'),
  args: { direction: 'row', children: pair },
} satisfies Meta<typeof Stack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Row: Story = { args: { direction: 'row', gap: 4 } };

export const Column: Story = {
  args: { direction: 'column', gap: 2, align: 'start' },
};
