import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../../../lib/generic/variations';
import {
  coreNavigationSections,
  sectionOrder,
} from '../../../../lib/product/navigation/sections';
import { pluginNavigationItems } from '../navigation-items.mocks';
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

// The rail at a window's height; the glass sits behind it in the Frame.
function RailColumn({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <View className="h-96 flex-row">{children}</View>;
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

// Paper's rail: the selected tile pressed in, and the hairline separator while the sidebar shows; none once it hides. A Plugin page lists its nav items after the core sections and has no sidebar toggle.
export const Overview: Story = {
  name: 'FrameRail',
  render: (args) => (
    <Variations className="flex-row">
      <Variation label="Sidebar shown">
        <RailColumn>
          <FrameRail {...args} sidebarShown />
        </RailColumn>
      </Variation>
      <Variation label="Sidebar hidden">
        <RailColumn>
          <FrameRail {...args} sidebarShown={false} />
        </RailColumn>
      </Variation>
      <PluginPageVariation {...args} />
    </Variations>
  ),
};
