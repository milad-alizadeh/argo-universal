import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { Surface } from '#primitives/layout/surface';
import { ScrollView } from './scroll-view';

const rows = Array.from({ length: 12 }, (_, index) => `Item ${index + 1}`);

const verticalRows = (
  <Stack direction="column" gap={3}>
    {rows.map((row) => (
      <Text key={row}>{row}</Text>
    ))}
  </Stack>
);

const horizontalRows = (
  <Stack direction="row" gap={3}>
    {rows.map((row) => (
      <Surface key={row} kind="card" padding={4}>
        <Text>{row}</Text>
      </Surface>
    ))}
  </Stack>
);

const meta = {
  title: 'Design System/Primitives/Layout/ScrollView',
  component: ScrollView,
  argTypes: kitArgTypes('ScrollView'),
  args: { children: verticalRows },
  // A bounded height is what makes the region scroll, as it has in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="h-40">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof ScrollView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Vertical: Story = { args: { direction: 'vertical' } };

export const Horizontal: Story = {
  args: { direction: 'horizontal', children: horizontalRows },
};

export const ContentFits: Story = {
  args: { children: <Text>All up to date</Text> },
  parameters: {
    docs: {
      description: { story: 'Content shorter than the region draws no fade.' },
    },
  },
};
