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

const rightHalf = (element: Element, row: Element): boolean => {
  const box = element.getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();

  return box.left > rowBox.left + rowBox.width / 2;
};

// Search sits last in a title container that fills the header, so it opens into a field over the whole row.
export const SearchFillsTheTitle: Story = {
  play: async ({ canvas, canvasElement, args, userEvent }) => {
    const header = canvas.getByRole('heading', { name: title });
    const search = canvas.getByRole('button', { name: label });

    await expect(rightHalf(search, canvasElement)).toBe(true);
    await expect(rightHalf(header, canvasElement)).toBe(false);
    await userEvent.click(search);
    await userEvent.type(canvas.getByRole('textbox', { name: label }), 'fix');
    await expect(args.onChangeText).toHaveBeenLastCalledWith('fix');
  },
};
