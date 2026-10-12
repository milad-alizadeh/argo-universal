import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { ContentLayout } from '#lib/product/content-layout';
import type { Section } from '../../../lib/product/navigation/sections';
import { DesktopRail } from './desktop-rail';
import { GlassSurface } from './glass-surface';
import { PanelResizeHandle } from './panel-resize-handle';
import { ShellBackdrop } from './shell-backdrop';
import { ShellPane } from './shell-pane';

export interface DesktopShellProps {
  selectedSection: Section;
  attentionCount: number;
  sidebarShown: boolean;
  onSidebarShownChange: (shown: boolean) => void;
  onSectionChange: (section: Section) => void;
  listHeader: ReactNode;
  list: ReactNode;
  // The detail page, which draws its own header.
  children: ReactNode;
  inspectorState: InspectorState;
  onInspectorStateChange: (state: InspectorState) => void;
  // The Inspector pane's page, told whether the Inspector fills the detail area, which the shell decides from the window's width.
  inspector: (expanded: boolean) => ReactNode;
}

// The expanded Inspector's resize handle sits this far right when the sidebar shows.
const expandedInspectorHandleShift = 4;
// With the Inspector closed, its handle keeps its whole grip inside the window's flush right edge.
const closedInspectorHandleInset = 4;

export type InspectorState = 'closed' | 'open' | 'expanded';

// The list scrolls across the whole pane, so its scrollbar sits at the pane's edge; its rows keep 8 from the rail and 14 from the pane's edge.
const listColumn = { paddingLeft: 8, paddingRight: 14 };

function useCSSPixels(name: string): number {
  return Number.parseFloat(String(useCSSVariable(name)));
}

// The wide window: a floating glass panel holds the rail and the open section's list over a faint warm glow; the detail and a flush Inspector sit on the window surface.
export function DesktopShell({
  selectedSection,
  attentionCount,
  sidebarShown,
  onSidebarShownChange,
  onSectionChange,
  listHeader,
  list,
  children,
  inspectorState,
  onInspectorStateChange,
  inspector,
}: DesktopShellProps): React.JSX.Element {
  const listWidth = useCSSPixels('--spacing-shell-list');
  const inspectorWidth = useCSSPixels('--spacing-shell-inspector');
  const railWidth = useCSSPixels('--spacing-shell-rail');
  const inset = useCSSPixels('--spacing-shell-inset');
  const detailMinimum = 360;
  const listMaximum = 460;
  const [preferredListWidth, setPreferredListWidth] = useState(listWidth);
  const [preferredInspectorWidth, setPreferredInspectorWidth] =
    useState(inspectorWidth);
  // The window's width until the shell measures itself: a pane first laid out at 0 wide pins the Feed's list to that width.
  const [width, setWidth] = useState(useWindowDimensions().width);
  const [resizing, setResizing] = useState(false);
  // The glass zone keeps the rail and its inset on both sides; the list, detail and Inspector share the rest.
  const usableWidth = Math.max(0, width - railWidth - inset * 2);
  const listLimit = Math.max(
    0,
    usableWidth - Math.min(detailMinimum, usableWidth / 2),
  );
  const visibleListWidth = Math.min(preferredListWidth, listLimit);
  const shownListWidth = sidebarShown ? visibleListWidth : 0;
  const availableWidth = Math.max(0, usableWidth - shownListWidth);
  const inspectorOpen = inspectorState !== 'closed';
  const inspectorExpanded =
    inspectorOpen &&
    (inspectorState === 'expanded' ||
      availableWidth < inspectorWidth + detailMinimum);
  const visibleInspectorWidth = Math.min(
    preferredInspectorWidth,
    Math.max(inspectorWidth, availableWidth - detailMinimum),
  );

  const transitionKey = `${sidebarShown}:${inspectorState}:${inspectorExpanded}`;
  let inspectorTargetWidth = 0;
  if (inspectorOpen && inspectorExpanded) inspectorTargetWidth = availableWidth;
  else if (inspectorOpen) inspectorTargetWidth = visibleInspectorWidth;
  const detailWidth = Math.max(0, availableWidth - inspectorTargetWidth);

  function resizeList(nextWidth: number): void {
    if (nextWidth < listWidth / 2) {
      onSidebarShownChange(false);
      return;
    }
    setPreferredListWidth(
      Math.max(listWidth, Math.min(listMaximum, listLimit, nextWidth)),
    );
    if (!sidebarShown) onSidebarShownChange(true);
  }

  function resizeInspector(nextWidth: number): void {
    if (nextWidth < inspectorWidth / 2) {
      onInspectorStateChange('closed');
      return;
    }
    if (nextWidth > availableWidth - detailMinimum / 2) {
      onInspectorStateChange('expanded');
      return;
    }
    setPreferredInspectorWidth(
      Math.max(
        inspectorWidth,
        Math.min(availableWidth - detailMinimum, nextWidth),
      ),
    );
    if (!inspectorOpen || inspectorExpanded) onInspectorStateChange('open');
  }

  return (
    <View
      testID="desktop-shell"
      className="flex-1 flex-row overflow-hidden bg-sidebar"
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      <ShellBackdrop
        sidebarShown={sidebarShown}
        transitionKey={transitionKey}
        animate={!resizing}
      />
      <View className="p-shell-inset">
        <View className="flex-1 flex-row">
          <GlassSurface
            width={railWidth + shownListWidth}
            expandedWidth={railWidth + visibleListWidth}
            transitionKey={transitionKey}
            animate={!resizing}
          />
          <DesktopRail
            selectedSection={selectedSection}
            attentionCount={attentionCount}
            sidebarShown={sidebarShown}
            onSectionChange={onSectionChange}
            onSidebarShownChange={onSidebarShownChange}
          />
          <ShellPane
            testID="desktop-list"
            width={shownListWidth}
            offset={0}
            contentWidth={visibleListWidth}
            hidden={!sidebarShown}
            transitionKey={transitionKey}
            animate={!resizing}
          >
            <View className="h-shell-control flex-row items-center gap-1 pl-6 pr-3.5">
              {listHeader}
            </View>
            <View className="-mt-0.5 min-h-0 flex-1 overflow-hidden">
              <ScrollColumnContext value={listColumn}>
                {list}
              </ScrollColumnContext>
            </View>
          </ShellPane>
        </View>
      </View>
      {listLimit > listWidth && (
        <View
          className="absolute top-0 bottom-shell-inset z-40"
          style={{ left: inset + railWidth + shownListWidth }}
        >
          <PanelResizeHandle
            label="Resize sidebar"
            value={shownListWidth}
            minimum={0}
            maximum={Math.min(listMaximum, listLimit)}
            direction={1}
            onChange={resizeList}
            onDragStateChange={setResizing}
          />
        </View>
      )}
      <View
        className="absolute top-0 bottom-0 z-30"
        style={{
          left:
            width -
            Math.max(inspectorTargetWidth, closedInspectorHandleInset) +
            (inspectorExpanded && sidebarShown
              ? expandedInspectorHandleShift
              : 0),
        }}
      >
        <PanelResizeHandle
          label="Resize Inspector"
          edge="left"
          value={inspectorTargetWidth}
          minimum={0}
          maximum={availableWidth}
          direction={-1}
          onChange={resizeInspector}
          onDragStateChange={setResizing}
        />
      </View>
      <View className="min-w-0 flex-1 flex-row">
        <ShellPane
          testID="desktop-detail"
          offset={shownListWidth}
          width={detailWidth}
          hidden={inspectorExpanded}
          transitionKey={transitionKey}
          animate={!resizing}
        >
          <ContentLayout className="overflow-hidden">{children}</ContentLayout>
        </ShellPane>
        <ShellPane
          testID="desktop-inspector"
          offset={usableWidth - inspectorTargetWidth}
          width={inspectorTargetWidth}
          hidden={!inspectorOpen}
          transitionKey={transitionKey}
          animate={!resizing}
        >
          {inspector(inspectorExpanded)}
        </ShellPane>
      </View>
    </View>
  );
}
