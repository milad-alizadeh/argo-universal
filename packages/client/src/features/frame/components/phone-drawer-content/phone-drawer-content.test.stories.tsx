import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import type { Section } from '../../../../lib/product/navigation/sections';
import { pluginNavigationItems } from '../navigation-items.mocks';
import { PhoneDrawerContent } from './phone-drawer-content';

const meta = {
  title: 'Tests/Frame/PhoneDrawerContent',
  component: PhoneDrawerContent,
  args: {
    items: pluginNavigationItems,
    selectedSection: 'sessions',
    attentionCount: 0,
    open: true,
    onSectionChange: fn(),
  },
} satisfies Meta<typeof PhoneDrawerContent>;

export default meta;

type Story = StoryObj<typeof meta>;

interface AttentionCase {
  count: number;
  label: string;
  text: string | null;
}

// Only the Sessions row carries the badge, capped at 99+.
function attentionBadge({ count, label, text }: AttentionCase): Story {
  return {
    args: { attentionCount: count },
    play: async ({ canvas }) => {
      const badge = canvas.queryByLabelText(label);

      if (text === null) return expect(badge).toBeNull();

      await expect(badge).toHaveTextContent(text);
    },
  };
}

export const NoAttention = attentionBadge({
  count: 0,
  label: '0 Sessions need attention',
  text: null,
});

export const OneAttention = attentionBadge({
  count: 1,
  label: '1 Session needs attention',
  text: '1',
});

export const OverflowAttention = attentionBadge({
  count: 100,
  label: '100 Sessions need attention',
  text: '99+',
});

// A Plugin nav item's count shows on its own row, capped at 99+.
export const PluginBadgeShowsOnItsRow: Story = {
  args: {
    pluginBadges: [
      { pluginId: 'issue-tracker', id: 'issues', count: 12 },
      { pluginId: 'example', id: 'example', count: 100 },
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

function selectedRow(section: Section): Story {
  return {
    args: { selectedSection: section },
    play: async ({ canvas }) => {
      for (const other of pluginNavigationItems)
        await expect(
          canvas.getByRole('button', { name: other.title }),
        ).toHaveAttribute('aria-pressed', String(other.id === section));
    },
  };
}

export const SessionsSelected = selectedRow('sessions');

export const SettingsSelected = selectedRow('settings');

export const PluginSelected = selectedRow('plugins/example/example');

// Core sections first, then each Plugin nav item in manifest order.
export const ListsCoreSectionsBeforePluginItems: Story = {
  play: async ({ canvas }) => {
    const rows = canvas.getAllByRole('button', {
      name: /^(Sessions|Settings|Issues|Example)$/,
    });

    await expect(rows).toHaveLength(pluginNavigationItems.length);

    for (const [index, item] of pluginNavigationItems.entries())
      await expect(rows[index]).toHaveAccessibleName(item.title);
  },
};

export const PickingARowReportsItsSection: Story = {
  play: async ({ args, canvas, userEvent }) => {
    for (const { id, title } of pluginNavigationItems) {
      await userEvent.click(canvas.getByRole('button', { name: title }));
      await expect(args.onSectionChange).toHaveBeenLastCalledWith(id);
    }
  },
};

export const ClosedIsHiddenFromAssistiveTechnology: Story = {
  args: { open: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('heading', { name: 'Argo' })).toBeNull();
  },
};
