import { OfferColumn } from '@repo/kit/content-column/content-column';
import { ScreenListColumn } from '@repo/kit/primitives/scaffolds/screen';
import { SelectionModeScope } from '@repo/kit/selection-mode';
import { SidebarGutterHeld } from '@repo/kit/sidebar-gutter';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import {
  FramePane,
  type FramePaneProps,
} from '../components/frame-pane/frame-pane';
import {
  GlassSurface,
  type GlassSurfaceProps,
} from '../components/glass-surface/glass-surface';
import type { FrameMotion } from '../utils/frame-timing';
import type { ScaffoldLayout } from './use-scaffold-layout';

// The list scrolls across the pane, with equal insets and its scrollbar at the edge.
const listColumn = { paddingLeft: 8, paddingRight: 8 };

interface SidebarLayout {
  layout: Pick<
    ScaffoldLayout,
    'measures' | 'rail' | 'list' | 'motion' | 'safeTop'
  >;
}

// A closed sidebar hides the whole panel, the rail with the list; a page with no list keeps the rail's.
const glassGeometry = ({
  layout,
}: SidebarLayout): Omit<GlassSurfaceProps, keyof FrameMotion> => ({
  width: layout.rail.width + layout.list.width,
  expandedWidth: layout.measures.railWidth + layout.list.openWidth,
  railWidth: layout.measures.railWidth,
  barHeight: layout.measures.titleBarHeight,
  sidebarShown: !layout.list.folded,
});

function SidebarGlass(parts: SidebarLayout): React.JSX.Element {
  return <GlassSurface {...glassGeometry(parts)} {...parts.layout.motion} />;
}

// The list's Screen draws its heading in the column's row under the window's band, so the heading slides with the list.
function SidebarListContent({ list }: { list: ReactNode }): React.JSX.Element {
  return (
    <SidebarGutterHeld value={Platform.OS === 'web'}>
      <ScreenListColumn underBand>
        <View className="-mt-0.5 min-h-0 flex-1 overflow-hidden">
          <OfferColumn column={listColumn}>{list}</OfferColumn>
        </View>
      </ScreenListColumn>
    </SidebarGutterHeld>
  );
}

type ListPlacement = Omit<FramePaneProps, 'testID' | 'children'>;

// The rail leaves with the list, keeping its width while its pane closes over it.
const railPlacement = ({ layout }: SidebarLayout): ListPlacement => ({
  width: layout.rail.width,
  offset: 0,
  contentWidth: layout.measures.railWidth,
  hidden: layout.rail.width === 0,
  ...layout.motion,
});

function SidebarRail({
  sidebar,
  layout,
}: SidebarLayout & { sidebar: ReactNode }): React.JSX.Element {
  return (
    <FramePane testID="desktop-rail-pane" {...railPlacement({ layout })}>
      {sidebar}
    </FramePane>
  );
}

const listPlacement = ({ layout }: SidebarLayout): ListPlacement => ({
  width: layout.list.width,
  offset: 0,
  contentWidth: layout.list.openWidth,
  hidden: layout.list.folded,
  ...layout.motion,
});

function SidebarList({
  list,
  layout,
}: SidebarLayout & { list: ReactNode }): React.JSX.Element {
  return (
    <FramePane testID="desktop-list" {...listPlacement({ layout })}>
      <SidebarListContent list={list} />
    </FramePane>
  );
}

export interface ScaffoldSidebarColumnProps extends SidebarLayout {
  // The sidebar Slot, which the caller may draw apart from the Scaffold's props.
  sidebar: ReactNode;
  list: ReactNode;
}

/*
 * The panel runs the window's height one inset in from its edges, as Mail's does: the title bar's row at its top holds
 * the window buttons and the band's controls, and the rail and the list start under it. Closed, the column takes no
 * width, so the page reaches the window's edge.
 */
const columnStyle = ({ layout }: SidebarLayout): ViewStyle => {
  const inset = layout.rail.width > 0 ? layout.measures.inset : 0;

  return {
    paddingTop: layout.safeTop + layout.measures.inset,
    paddingBottom: layout.measures.inset,
    paddingLeft: inset,
    paddingRight: inset,
  };
};

function SidebarColumnDrawing({
  sidebar,
  list,
  layout,
}: ScaffoldSidebarColumnProps): React.JSX.Element {
  return (
    <View testID="desktop-sidebar" style={columnStyle({ layout })}>
      <View className="flex-1 flex-row">
        <SidebarGlass layout={layout} />
        <View
          className="flex-1 flex-row"
          style={{ paddingTop: layout.measures.titleBarHeight }}
        >
          <SidebarRail sidebar={sidebar} layout={layout} />
          <SidebarList list={list} layout={layout} />
        </View>
      </View>
    </View>
  );
}

// The glass panel of the sidebar Slot and the list beside it, sized by its content.
export function ScaffoldSidebarColumn(
  props: ScaffoldSidebarColumnProps,
): React.JSX.Element {
  return (
    <SelectionModeScope>
      <SidebarColumnDrawing {...props} />
    </SelectionModeScope>
  );
}
