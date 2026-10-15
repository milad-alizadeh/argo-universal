import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import {
  FramePane,
  type FramePaneProps,
} from '../components/frame-pane/frame-pane';
import { GlassSurface } from '../components/glass-surface/glass-surface';
import type {
  ScaffoldLayout,
  ScaffoldPartProps,
  ScaffoldProps,
} from './use-scaffold-layout';

// The list scrolls across the whole pane, so its scrollbar sits at the pane's edge; its rows keep 8 from the rail and 14 from the pane's edge.
const listColumn = { paddingLeft: 8, paddingRight: 14 };

function SidebarGlass({
  layout,
}: {
  layout: ScaffoldLayout;
}): React.JSX.Element {
  const { measures, shownListWidth, visibleListWidth } = layout;

  return (
    <GlassSurface
      width={measures.railWidth + shownListWidth}
      expandedWidth={measures.railWidth + visibleListWidth}
      {...layout.motion}
    />
  );
}

function SidebarListContent({
  listHeader,
  list,
}: ScaffoldProps): React.JSX.Element {
  return (
    <>
      <View className="h-frame-control flex-row items-center gap-1 pl-6 pr-3.5">
        {listHeader}
      </View>
      <View className="-mt-0.5 min-h-0 flex-1 overflow-hidden">
        <ScrollColumnContext value={listColumn}>{list}</ScrollColumnContext>
      </View>
    </>
  );
}

type ListPlacement = Omit<FramePaneProps, 'testID' | 'children'>;

const listPlacement = ({
  scaffold,
  layout,
}: ScaffoldPartProps): ListPlacement => ({
  width: layout.shownListWidth,
  offset: 0,
  contentWidth: layout.visibleListWidth,
  hidden: !scaffold.sidebarShown,
  ...layout.motion,
});

function SidebarList(parts: ScaffoldPartProps): React.JSX.Element {
  return (
    <FramePane testID="desktop-list" {...listPlacement(parts)}>
      <SidebarListContent {...parts.scaffold} />
    </FramePane>
  );
}

export interface ScaffoldSidebarColumnProps extends ScaffoldPartProps {
  // The sidebar Slot, which the caller may draw apart from the Scaffold's props.
  sidebar: ReactNode;
}

// The glass panel: the sidebar Slot and the list beside it.
export function ScaffoldSidebarColumn({
  sidebar,
  ...parts
}: ScaffoldSidebarColumnProps): React.JSX.Element {
  return (
    <View className="p-frame-inset">
      <View className="flex-1 flex-row">
        <SidebarGlass layout={parts.layout} />
        {sidebar}
        <SidebarList {...parts} />
      </View>
    </View>
  );
}
