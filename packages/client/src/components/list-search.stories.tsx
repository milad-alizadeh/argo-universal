import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { ListSearch } from './list-search';

const meta = {
  title: 'Sessions/ListSearch',
  component: ListSearch,
  parameters: { previewPadding: false },
  args: { title: 'Sessions', value: '', onChangeText: () => {} },
  render: function SearchPreview(args) {
    const [query, setQuery] = useState(args.value);
    return (
      <View className="h-11 w-full flex-row items-center bg-background px-2 wide:h-14 wide:w-shell-list wide:bg-sidebar">
        <ListSearch title={args.title} value={query} onChangeText={setQuery} />
      </View>
    );
  },
} satisfies Meta<typeof ListSearch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'ListSearch' };
