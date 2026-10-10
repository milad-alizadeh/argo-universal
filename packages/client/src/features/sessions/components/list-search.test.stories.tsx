import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { ListSearch } from './list-search';

const searchPlaceholder = 'Search Sessions';

const meta = {
  title: 'Tests/ListSearch',
  component: ListSearch,
  parameters: { previewPadding: false },
  args: { title: 'Sessions', value: '', onChangeText: (): void => {} },
  render: function SearchPreview(args): React.JSX.Element {
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

function searchFocusAndReset(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      if ('__vitest_browser__' in globalThis) await settleViewport(width);
      await expect(canvas.queryByRole('textbox')).toBeNull();
      await userEvent.click(
        canvas.getByRole('button', { name: searchPlaceholder }),
      );
      await waitFor(() =>
        expect(
          canvas.getByRole('textbox', { name: searchPlaceholder }),
        ).toHaveFocus(),
      );
      await userEvent.type(
        canvas.getByRole('textbox', { name: searchPlaceholder }),
        'settings',
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close search' }),
      );
      await waitFor(() => expect(canvas.queryByRole('textbox')).toBeNull());
      await userEvent.click(
        canvas.getByRole('button', { name: searchPlaceholder }),
      );
      await expect(
        canvas.getByRole('textbox', { name: searchPlaceholder }),
      ).toHaveValue('');
      await waitFor(() =>
        expect(
          canvas.getByRole('textbox', { name: searchPlaceholder }),
        ).toHaveFocus(),
      );
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(canvas.queryByRole('textbox')).toBeNull());
    },
  };
}
export const FocusAndResetPhone = searchFocusAndReset(layoutWidths.phone);
export const FocusAndResetWide = searchFocusAndReset(layoutWidths.wide);
