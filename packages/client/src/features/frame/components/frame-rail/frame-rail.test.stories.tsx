import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { pluginNavigationItems } from '../navigation-items.mocks';
import { FrameRail } from './frame-rail';

const meta = {
  title: 'Tests/FrameRail',
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

export const SectionWithAListTogglesTheSidebar: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: sidebarToggle }),
    ).toBeVisible();
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
