import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Header, SafeAreaProviderCompat } from 'expo-router/react-navigation';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { HeaderSearchRow, headerSearchRowLayout } from './header-search';

const title = 'Sessions';

const label = 'Search Sessions';

// The real web JS header, as a narrow web window's stack draws it, with the app's search row options.
function WebHeaderWithSearch({
  onChangeText,
}: {
  onChangeText: (text: string) => void;
}): React.JSX.Element {
  return (
    <SafeAreaProviderCompat>
      <Header
        title={title}
        headerTitle={() => (
          <HeaderSearchRow
            title={title}
            search={{ placeholder: label, onChangeText }}
          />
        )}
        {...headerSearchRowLayout}
      />
    </SafeAreaProviderCompat>
  );
}

const meta = {
  title: 'Tests/HeaderSearchRow',
  component: WebHeaderWithSearch,
  args: { onChangeText: fn() },
} satisfies Meta<typeof WebHeaderWithSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

// Search sits beside the title in the real web header and opens into a field that filters as you type.
export const SearchFillsTheTitle: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('heading', { name: title })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: label }));
    await userEvent.type(canvas.getByRole('textbox', { name: label }), 'fix');
    await expect(args.onChangeText).toHaveBeenLastCalledWith('fix');
  },
};
