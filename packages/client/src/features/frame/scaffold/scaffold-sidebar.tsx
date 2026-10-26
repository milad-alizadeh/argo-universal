import { ScreenListColumn } from '@repo/kit/primitives/scaffolds/screen';
import { ScrollColumnContext } from '@repo/kit/scroll-column';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  FramePane,
  type FramePaneProps,
} from '../components/frame-pane/frame-pane';
import {
  GlassSurface,
  type GlassSurfaceProps,
} from '../components/glass-surface/glass-surface';
import type { FrameMotion } from '../utils/frame-timing';
import type { ScaffoldPartProps, ScaffoldProps } from './use-scaffold-layout';

// The list scrolls across the whole pane, so its scrollbar sits at the pane's edge; its rows keep 8 from the rail and 14 from the pane's edge.
const listColumn = { paddingLeft: 8, paddingRight: 14 };

const glassGeometry = ({
  layout,
}: ScaffoldPartProps): Omit<GlassSurfaceProps, keyof FrameMotion> => ({
  width: layout.measures.railWidth + layout.shownListWidth,
  expandedWidth: layout.measures.railWidth + layout.visibleListWidth,
  railWidth: layout.measures.railWidth,
  barHeight: 0,
  sidebarShown: !layout.frame.listFolded,
});

function SidebarGlass(parts: ScaffoldPartProps): React.JSX.Element {
  return <GlassSurface {...glassGeometry(parts)} {...parts.layout.motion} />;
}

// The list's Screen draws its heading in the column's row under the window's band, so the heading slides with the list.
function SidebarListContent({ list }: ScaffoldProps): React.JSX.Element {
  return (
    <ScreenListColumn underBand>
      <View className="-mt-0.5 min-h-0 flex-1 overflow-hidden">
        <ScrollColumnContext value={listColumn}>{list}</ScrollColumnContext>
      </View>
    </ScreenListColumn>
  );
}

type ListPlacement = Omit<FramePaneProps, 'testID' | 'children'>;

const listPlacement = ({ layout }: ScaffoldPartProps): ListPlacement => ({
  width: layout.shownListWidth,
  offset: 0,
  contentWidth: layout.visibleListWidth,
  hidden: layout.frame.listFolded,
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
    <View className="px-frame-inset pb-frame-inset">
      <View className="flex-1 flex-row">
        <SidebarGlass {...parts} />
        {sidebar}
        <SidebarList {...parts} />
      </View>
    </View>
  );
}
