import { OfferColumn } from '@repo/kit/content-column/content-column';
import { ScreenListColumn } from '@repo/kit/primitives/scaffolds/screen';
import { SelectionModeScope } from '@repo/kit/selection-mode';
import { SidebarGutterHeld } from '@repo/kit/sidebar-gutter';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
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
  layout: Pick<ScaffoldLayout, 'measures' | 'list' | 'motion'>;
}

const glassGeometry = ({
  layout,
}: SidebarLayout): Omit<GlassSurfaceProps, keyof FrameMotion> => ({
  width: layout.measures.railWidth + layout.list.width,
  expandedWidth: layout.measures.railWidth + layout.list.openWidth,
  railWidth: layout.measures.railWidth,
  barHeight: 0,
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

function SidebarColumnDrawing({
  sidebar,
  list,
  layout,
}: ScaffoldSidebarColumnProps): React.JSX.Element {
  return (
    <View className="px-frame-inset pb-frame-inset">
      <View className="flex-1 flex-row">
        <SidebarGlass layout={layout} />
        {sidebar}
        <SidebarList list={list} layout={layout} />
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
