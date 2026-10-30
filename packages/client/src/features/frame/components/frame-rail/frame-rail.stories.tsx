import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { sectionOrder } from '../../../../lib/product/navigation/sections';
import { FrameRail } from './frame-rail';
import {
  collapsedRail,
  expandedRail,
  manyPluginSectionsRail,
  pluginBadgeRail,
} from './frame-rail-fixtures';

// The rail at a window's height on the glass's tint, which the Frame draws behind it.
function railColumn(className: string) {
  return function RailColumn(Story: React.ComponentType): React.JSX.Element {
    return (
      <View className={className}>
        <Story />
      </View>
    );
  };
}

// Paper "Rail · narrow variants", Variant B: 40 tiles on the tinted rail, the selected one a flat tint, and no separator.
const meta = {
  title: 'Frame/FrameRail',
  component: FrameRail,
  decorators: [railColumn('h-96 flex-row bg-hover')],
  argTypes: {
    items: { control: false },
    hasSidebar: { control: 'boolean' },
    selectedSection: { control: 'select', options: [...sectionOrder] },
    attentionCount: { control: 'number' },
    pluginBadges: { control: false },
    sidebarShown: { control: 'boolean' },
    onSectionChange: { control: false },
    onSidebarShownChange: { control: false },
  },
  args: {
    ...expandedRail,
    onSectionChange: action('section changed'),
    onSidebarShownChange: action('sidebar changed'),
  },
} satisfies Meta<typeof FrameRail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded: Story = { args: expandedRail };

// With the sidebar hidden the tiles take the collapsed column and the tablet's edge goes.
export const Collapsed: Story = { args: collapsedRail };

// Once Plugins add more sections than the window holds, the sections scroll above the toggle.
export const ManyPluginSections: Story = {
  name: 'Many Plugin sections',
  args: manyPluginSectionsRail,
  decorators: [railColumn('h-64 flex-row bg-hover')],
};

// A Plugin's `argo.nav.badge` count rides its tile's corner, capped at 99+.
export const PluginBadges: Story = { args: pluginBadgeRail };

// A pointer over an unselected tile darkens its icon. The tile's fill and the selected tile's hairline ring are CSS `:hover`, which the story's synthetic hover never sets, so they are not drawn here; a selected tile hovered draws as Expanded does.
export const Hovered: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole('button', { name: 'Settings' }));
  },
};
