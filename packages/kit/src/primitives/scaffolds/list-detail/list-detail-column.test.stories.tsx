import type { Meta } from '@storybook/react-native-web-vite';
import { useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { createPlace, useClaimed, type Place } from '#kit/place';
import { layoutWidths } from '#mocks/story-layout';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { ScreenListColumn } from '#primitives/scaffolds/screen';
import { ListDetail } from './list-detail';
import { ListDetailSidebarPlaceOffer } from './list-detail-sidebar';
import { at } from './list-detail-test.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/ListDetail/Column',
  component: ListDetail,
  args: { list: null },
} satisfies Meta<typeof ListDetail>;

export default meta;

const onFilter = fn();

const screen = {
  title: 'Issues',
  search: { label: 'Search Issues' },
  value: '',
  onChangeText: fn(),
  actions: <Action label="Filter" icon="filters" onPress={onFilter} />,
};

function SidebarColumn({
  sidebar,
}: {
  sidebar: Place<ReactNode>;
}): ReactElement {
  const list = useClaimed(sidebar);

  return (
    <ScreenListColumn>
      <View className="flex-1">{list}</View>
    </ScreenListColumn>
  );
}

// The host draws the sidebar's column, whose heading row the list's own Screen fills.
function WithColumn(): ReactElement {
  const [sidebar] = useState(() => createPlace<ReactNode>());

  return (
    <View className="flex-1 flex-row">
      <View testID="host-sidebar" className="w-frame-list">
        <SidebarColumn sidebar={sidebar} />
      </View>
      <View testID="host-page" className="flex-1">
        <ListDetailSidebarPlaceOffer value={sidebar}>
          <ListDetail
            screen={screen}
            list={<Text>Issue rows</Text>}
            detail={<Text>Issue detail</Text>}
          />
        </ListDetailSidebarPlaceOffer>
      </View>
    </View>
  );
}

// A wide ListDetail's Screen is declared once and drawn above its list in the sidebar's column, with its search and Actions, not in the page beside it.
export const ListScreenHeadsTheSidebarColumn = at(layoutWidths.wide, {
  render: () => <WithColumn />,
  beforeEach: () => onFilter.mockClear(),
  play: async ({ canvas, userEvent }) => {
    const column = await canvas.findByTestId('list-column-heading');

    await waitFor(() =>
      expect(column).toContainElement(
        canvas.getByRole('heading', { name: 'Issues' }),
      ),
    );
    const heading = canvas.getByRole('heading', { name: 'Issues' });
    const sidebar = canvas.getByTestId('host-sidebar');

    await expect(
      heading.getBoundingClientRect().left -
        sidebar.getBoundingClientRect().left,
    ).toBe(24);
    await expect(column).toContainElement(
      canvas.getByRole('button', { name: 'Search Issues' }),
    );
    await expect(canvas.getByTestId('host-page')).not.toContainElement(
      canvas.getByRole('heading', { name: 'Issues' }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Filter' }));
    await expect(onFilter).toHaveBeenCalledTimes(1);
  },
});
