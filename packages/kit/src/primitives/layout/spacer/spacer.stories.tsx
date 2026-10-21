import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { Spacer } from './spacer';

const meta = {
  title: 'Design System/Primitives/Layout/Spacer',
  component: Spacer,
  argTypes: kitArgTypes('Spacer'),
} satisfies Meta<typeof Spacer>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * A Spacer declares no props of its own: each story draws the layout it takes its
 * space from, so every state keeps its own render.
 */
export const Horizontal: Story = {
  render: () => (
    <Stack direction="row">
      <Text>Start</Text>
      <Spacer />
      <Text>End</Text>
    </Stack>
  ),
  parameters: {
    docs: { description: { story: 'Flexible space along a row.' } },
  },
};

export const Vertical: Story = {
  render: () => (
    <View className="h-40">
      <View className="flex-1">
        <Text>Title</Text>
        <Spacer />
        <Text>Continue</Text>
      </View>
    </View>
  ),
  parameters: {
    docs: { description: { story: 'Flexible space down a column.' } },
  },
};

export const TwoSpacers: Story = {
  render: () => (
    <Stack direction="row">
      <Text>Start</Text>
      <Spacer />
      <Text>Centre</Text>
      <Spacer />
      <Text>End</Text>
    </Stack>
  ),
};
