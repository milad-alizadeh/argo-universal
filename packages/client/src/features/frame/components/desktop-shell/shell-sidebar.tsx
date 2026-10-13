import type * as React from 'react';
import { View } from 'react-native';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { GlassSurface } from '../glass-surface/glass-surface';
import { ShellPane } from '../shell-pane/shell-pane';
import { DesktopRail } from './desktop-rail';
import type { DesktopShellProps } from './desktop-shell-props';
import type { ShellLayout, ShellPartProps } from './use-shell-layout';

// The list scrolls across the whole pane, so its scrollbar sits at the pane's edge; its rows keep 8 from the rail and 14 from the pane's edge.
const listColumn = { paddingLeft: 8, paddingRight: 14 };

function SidebarGlass({ layout }: { layout: ShellLayout }): React.JSX.Element {
  const { measures, shownListWidth, visibleListWidth } = layout;

  return (
    <GlassSurface
      width={measures.railWidth + shownListWidth}
      expandedWidth={measures.railWidth + visibleListWidth}
      {...layout.motion}
    />
  );
}

function SidebarRail({
  shell,
}: {
  shell: DesktopShellProps;
}): React.JSX.Element {
  return (
    <DesktopRail
      selectedSection={shell.selectedSection}
      attentionCount={shell.attentionCount}
      sidebarShown={shell.sidebarShown}
      onSectionChange={shell.onSectionChange}
      onSidebarShownChange={shell.onSidebarShownChange}
    />
  );
}

function SidebarListContent({
  listHeader,
  list,
}: DesktopShellProps): React.JSX.Element {
  return (
    <>
      <View className="h-shell-control flex-row items-center gap-1 pl-6 pr-3.5">
        {listHeader}
      </View>
      <View className="-mt-0.5 min-h-0 flex-1 overflow-hidden">
        <ScrollColumnContext value={listColumn}>{list}</ScrollColumnContext>
      </View>
    </>
  );
}

function SidebarList({ shell, layout }: ShellPartProps): React.JSX.Element {
  return (
    <ShellPane
      testID="desktop-list"
      width={layout.shownListWidth}
      offset={0}
      contentWidth={layout.visibleListWidth}
      hidden={!shell.sidebarShown}
      {...layout.motion}
    >
      <SidebarListContent {...shell} />
    </ShellPane>
  );
}

export function ShellSidebar(parts: ShellPartProps): React.JSX.Element {
  return (
    <View className="p-shell-inset">
      <View className="flex-1 flex-row">
        <SidebarGlass layout={parts.layout} />
        <SidebarRail shell={parts.shell} />
        <SidebarList {...parts} />
      </View>
    </View>
  );
}
