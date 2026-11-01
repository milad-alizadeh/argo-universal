import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { withStack } from '#story-stack';
import { SearchField } from './search-field.android';

const noop = (): void => {
  // The query is not under test.
};

// The Android build is drawn directly, inside a stack for the stock header it draws; the web build never reaches it.
const meta = {
  title: 'Tests/Design System/Primitives/Controls/SearchField/Android',
  decorators: [withStack()],
  render: (): ReactElement => (
    <View className="w-full" testID="column">
      <SearchField
        label="Search Agents"
        value=""
        onChangeText={noop}
        title={<Text role="title">Agents</Text>}
      />
    </View>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const left = (element: Element): number => element.getBoundingClientRect().left;

// The page's title starts on its column's line, not the stock header's 16dp in from it.
export const TitleStartsOnTheColumnLine: Story = {
  play: async ({ canvas }) => {
    await expect(left(await canvas.findByText('Agents'))).toBe(
      left(await canvas.findByTestId('column')),
    );
  },
};
