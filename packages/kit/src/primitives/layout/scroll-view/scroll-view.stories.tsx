import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ScrollView } from './scroll-view';
import {
  contentFitsScrollView,
  horizontalScrollView,
  verticalScrollView,
} from './scroll-view-fixtures';

const meta = {
  title: 'Design System/Primitives/Layout/ScrollView',
  component: ScrollView,
  argTypes: kitArgTypes('ScrollView'),
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

export const Vertical: Story = { args: verticalScrollView };

export const Horizontal: Story = { args: horizontalScrollView };

export const ContentFits: Story = {
  args: contentFitsScrollView,
  parameters: {
    docs: {
      description: { story: 'Content shorter than the region draws no fade.' },
    },
  },
};
