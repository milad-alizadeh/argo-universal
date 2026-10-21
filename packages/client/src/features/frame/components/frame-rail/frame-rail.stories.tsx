import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import {
  coreNavigationSections,
  sectionOrder,
} from '../../../../lib/product/navigation/sections';
import {
  manyPluginNavigationItems,
  pluginNavigationItems,
} from '../navigation-items.mocks';
import { FrameRail } from './frame-rail';

type FrameRailProps = React.ComponentProps<typeof FrameRail>;

const meta = {
  title: 'Frame/FrameRail',
  component: FrameRail,
  argTypes: {
    selectedSection: { control: 'select', options: [...sectionOrder] },
    attentionCount: { control: 'number' },
  },
  args: {
    items: coreNavigationSections,
    hasSidebar: true,
    selectedSection: 'sessions',
    attentionCount: 1,
    sidebarShown: true,
    onSectionChange: action('section changed'),
    onSidebarShownChange: action('sidebar changed'),
  },
} satisfies Meta<typeof FrameRail>;

export default meta;

type Story = StoryObj<typeof meta>;

// The rail at a window's height on the glass's tint, which the Frame draws behind it; a short window scrolls the sections.
function RailColumn({
  children,
  short = false,
}: {
  children: React.ReactNode;
  short?: boolean;
}): React.JSX.Element {
  return (
    <View
      className={short ? 'h-64 flex-row bg-hover' : 'h-96 flex-row bg-hover'}
    >
      {children}
    </View>
  );
}

function PluginPageVariation(args: FrameRailProps): React.JSX.Element {
  return (
    <Variation label="Plugin page">
      <RailColumn>
        <FrameRail
          {...args}
          items={pluginNavigationItems}
          selectedSection="plugins/issue-tracker/issues"
          hasSidebar={false}
          sidebarShown={false}
        />
      </RailColumn>
    </Variation>
  );
}

function SidebarVariation({
  label,
  ...args
}: FrameRailProps & { label: string }): React.JSX.Element {
  return (
    <Variation label={label}>
      <RailColumn>
        <FrameRail {...args} />
      </RailColumn>
    </Variation>
  );
}

function ManySectionsVariation(args: FrameRailProps): React.JSX.Element {
  return (
    <Variation label="Many Plugin sections">
      <RailColumn short>
        <FrameRail {...args} items={manyPluginNavigationItems} />
      </RailColumn>
    </Variation>
  );
}

// Paper "Rail · narrow variants", Variant B: 40 tiles on the tinted rail, the selected one a flat tint, and no separator. A Plugin page lists its nav items after the core sections and has no sidebar toggle; once Plugins add more than the window holds, the sections scroll above the toggle.
export const Overview: Story = {
  render: (args) => (
    <Variations className="flex-row">
      <SidebarVariation {...args} label="Sidebar shown" sidebarShown />
      <SidebarVariation {...args} label="Sidebar hidden" sidebarShown={false} />
      <PluginPageVariation {...args} />
      <ManySectionsVariation {...args} />
    </Variations>
  ),
};
