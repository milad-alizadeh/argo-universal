import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { ListSearch } from './ListSearch';

const meta = {
  title: 'Sessions/ListSearch',
  component: ListSearch,
  args: { title: 'Sessions', value: '', onChangeText: () => {} },
  render: function SearchPreview(args) {
    const [query, setQuery] = useState(args.value);
    return (
      <View className="w-full max-w-96 rounded-md bg-background wide:bg-sidebar p-2">
        <View className="flex-row items-center">
          <ListSearch
            title={args.title}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>
    );
  },
} satisfies Meta<typeof ListSearch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Search: Story = {};
