import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import {
  manyPluginNavigationItems,
  pluginNavigationItems,
} from '../navigation-items.mocks';
import { FrameRail } from './frame-rail';

const meta = {
  title: 'Tests/Frame/FrameRail',
  component: FrameRail,
  args: {
    items: pluginNavigationItems,
    hasSidebar: true,
    selectedSection: 'sessions',
    attentionCount: 0,
    sidebarShown: true,
    onSectionChange: fn(),
    onSidebarShownChange: fn(),
  },
} satisfies Meta<typeof FrameRail>;

export default meta;

type Story = StoryObj<typeof meta>;

const sidebarToggle = /^(Hide|Show) sidebar$/;

// Core sections first, then each Plugin nav item in manifest order; a tile reports its section.
export const ListsAndPicksPluginItems: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const tiles = canvas.getAllByRole('button', {
      name: /^(Sessions|Settings|Issues|Hello)$/,
    });

    await expect(tiles).toHaveLength(pluginNavigationItems.length);

    for (const [index, item] of pluginNavigationItems.entries())
      await expect(tiles[index]).toHaveAccessibleName(item.title);

    for (const { id, title } of pluginNavigationItems) {
      await userEvent.click(canvas.getByRole('button', { name: title }));
      await expect(args.onSectionChange).toHaveBeenLastCalledWith(id);
    }
  },
};

export const KeyboardFocusActivatesASection: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const sessions = canvas.getByRole('button', { name: 'Sessions' });

    await userEvent.tab();
    await expect(sessions).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSectionChange).toHaveBeenLastCalledWith('sessions');
  },
};

export const SidebarToggleBelongsToTheBand: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('button', { name: sidebarToggle }),
    ).toBeNull();
  },
};

// More Plugin sections than a short window holds remain reachable by scrolling.
export const ManySectionsScrollToTheLastItem: Story = {
  args: { items: manyPluginNavigationItems },
  decorators: [
    (Story) => (
      <View className="h-64 flex-row">
        <Story />
      </View>
    ),
  ],
  play: async ({ args, canvas, userEvent }) => {
    const last = manyPluginNavigationItems.at(-1);
    const tile = canvas.getByRole('button', { name: last?.title });

    tile.scrollIntoView();
    await userEvent.click(tile);

    await expect(args.onSectionChange).toHaveBeenLastCalledWith(last?.id);
    await expect(
      canvas.queryByRole('button', { name: sidebarToggle }),
    ).toBeNull();
  },
};

// A Plugin page has no list beside it, so nothing to toggle.
export const PluginPageHasNoSidebarToggle: Story = {
  args: { selectedSection: 'plugins/hello/hello', hasSidebar: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Hello' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(
      canvas.queryByRole('button', { name: sidebarToggle }),
    ).toBeNull();
  },
};

// A Plugin nav item's count shows on its own tile, capped at 99+; a zero or other tile shows none.
export const PluginBadgeShowsOnItsTile: Story = {
  args: {
    pluginBadges: [
      { pluginId: 'issue-tracker', id: 'issues', count: 12 },
      { pluginId: 'hello', id: 'hello', count: 100 },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('12')).toHaveTextContent('12');
    await expect(canvas.getByLabelText('99+')).toHaveTextContent('99+');
  },
};

export const ZeroPluginBadgeShowsNothing: Story = {
  args: {
    pluginBadges: [{ pluginId: 'issue-tracker', id: 'issues', count: 0 }],
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByLabelText('0')).toBeNull();
  },
};
