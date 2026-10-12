import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import { HeaderButton } from '../header-button';
import { useHeaderSearch } from './header-search';

const placeholder = 'Search Sessions';

// A header row drawn from the hook: the field in the title's place, then the trailing items in order.
function HeaderRow(props: {
  onChangeText: (text: string) => void;
}): React.JSX.Element {
  const filter = (
    <HeaderButton
      key="filter"
      icon="filters"
      accessibilityLabel="Filter Sessions"
    />
  );
  const { field, right } = useHeaderSearch(
    { placeholder, onChangeText: props.onChangeText },
    [filter],
  );
  return (
    <View className="flex-row items-center">
      {field}
      {right}
    </View>
  );
}

const meta = {
  title: 'Tests/HeaderSearch',
  component: HeaderRow,
  args: { onChangeText: fn() },
} satisfies Meta<typeof HeaderRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PutsSearchAfterTheTrailingItems: Story = {
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole('button');
    await expect(
      buttons.map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Filter Sessions', placeholder]);
  },
};

export const OpensAFieldOverTheItemsAndClearsItOnClose: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: placeholder }));
    await userEvent.type(canvas.getByPlaceholderText(placeholder), 'flaky');
    await expect(args.onChangeText).toHaveBeenLastCalledWith('flaky');
    await expect(
      canvas.queryByRole('button', { name: 'Filter Sessions' }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Close search' }));
    await expect(args.onChangeText).toHaveBeenLastCalledWith('');
    await expect(canvas.queryByPlaceholderText(placeholder)).toBeNull();
  },
};
