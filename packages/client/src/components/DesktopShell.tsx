import { ArrowsInSimpleIcon } from 'phosphor-react-native/src/icons/ArrowsInSimple';
import { ArrowsOutSimpleIcon } from 'phosphor-react-native/src/icons/ArrowsOutSimple';
import { SidebarSimpleIcon } from 'phosphor-react-native/src/icons/SidebarSimple';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Icon } from '../lib/icon';
import { ContentLayout } from './ContentLayout';
import { DesktopRail } from './DesktopRail';
import { PanelResizeHandle } from './PanelResizeHandle';
import { ScrollFadeView } from './ScrollFade';
import type { ShellSection } from './shell-sections';
import { ShellHeaderActions } from './ShellHeaderActions';
import { ShellHeaderContent } from './ShellHeaderContent';
import { ShellPane } from './ShellPane';

export interface DesktopShellProps {
  selectedSection: ShellSection;
  attentionCount: number;
  sidebarShown: boolean;
  onSidebarShownChange: (shown: boolean) => void;
  onSectionChange: (section: ShellSection) => void;
  listHeader: ReactNode;
  list: ReactNode;
  detailHeader: ReactNode;
  detailActions?: ReactNode;
  children: ReactNode;
  inspectorState: InspectorState;
  onInspectorStateChange: (state: InspectorState) => void;
  inspectorHeader: ReactNode;
  inspector: ReactNode;
}

// With the sidebar hidden, a header title starts this far in, clear of the sidebar toggle.
const hiddenSidebarTitleInset = 32;
// The expanded Inspector's resize handle sits this far right when the sidebar shows.
const expandedInspectorHandleShift = 4;

export type InspectorState = 'closed' | 'open' | 'expanded';

export function DesktopShell({
  selectedSection,
  attentionCount,
  sidebarShown,
  onSidebarShownChange,
  onSectionChange,
  listHeader,
  list,
  detailHeader,
  detailActions,
  children,
  inspectorState,
  onInspectorStateChange,
  inspectorHeader,
  inspector,
}: DesktopShellProps) {
  const listWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-shell-list')),
  );
  const inspectorWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-shell-inspector')),
  );
  const detailMinimum = 360;
  const railWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-shell-bar')),
  );
  const inset = Number.parseFloat(
    String(useCSSVariable('--spacing-shell-inset')),
  );
  const listMaximum = 460;
  const [preferredListWidth, setPreferredListWidth] = useState(listWidth);
  const [preferredInspectorWidth, setPreferredInspectorWidth] =
    useState(inspectorWidth);
  const [width, setWidth] = useState(0);
  const [resizing, setResizing] = useState(false);
  const usableWidth = Math.max(0, width - railWidth - inset);
  const listLimit = Math.max(
    0,
    usableWidth - Math.min(detailMinimum, usableWidth / 2),
  );
  const visibleListWidth = Math.min(preferredListWidth, listLimit);
  const availableWidth = Math.max(
    0,
    width - railWidth - inset - (sidebarShown ? visibleListWidth : 0),
  );
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

  function resizeList(nextWidth: number) {
    if (nextWidth < listWidth / 2) {
      onSidebarShownChange(false);
      return;
    }
    setPreferredListWidth(
      Math.max(listWidth, Math.min(listMaximum, listLimit, nextWidth)),
    );
    if (!sidebarShown) onSidebarShownChange(true);
  }

  function resizeInspector(nextWidth: number) {
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
      className="flex-1 flex-row overflow-hidden bg-shell-chrome"
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      <View className="absolute left-shell-bar top-0 z-20 h-shell-bar w-12 items-start justify-center pl-1">
        <Button
          variant="ghost"
          className="size-8 p-0 sm:size-8"
          accessibilityLabel={sidebarShown ? 'Hide sidebar' : 'Show sidebar'}
          onPress={() => onSidebarShownChange(!sidebarShown)}
        >
          <Icon as={SidebarSimpleIcon} className="text-muted-foreground" />
        </Button>
      </View>
      <DesktopRail
        selectedSection={selectedSection}
        attentionCount={attentionCount}
        onSectionChange={onSectionChange}
      />
      {listLimit > listWidth && (
        <View
          className="absolute top-0 bottom-shell-inset z-40"
          style={{ left: railWidth + (sidebarShown ? visibleListWidth : 0) }}
        >
          <PanelResizeHandle
            label="Resize sidebar"
            value={sidebarShown ? visibleListWidth : 0}
            minimum={0}
            maximum={Math.min(listMaximum, listLimit)}
            direction={1}
            onChange={resizeList}
            onDragStateChange={setResizing}
          />
        </View>
      )}
      <View
        className="absolute top-0 bottom-shell-inset z-30"
        style={{
          left:
            railWidth +
            usableWidth -
            inspectorTargetWidth +
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
      <View className="min-w-0 flex-1 flex-row pb-shell-inset pr-shell-inset">
        <View
          testID="desktop-panel"
          pointerEvents="none"
          className="absolute bottom-shell-inset left-0 right-shell-inset top-shell-bar rounded-xl bg-sidebar"
        />
        <ShellPane
          testID="desktop-list"
          width={sidebarShown ? visibleListWidth : 0}
          offset={0}
          contentWidth={visibleListWidth}
          hidden={!sidebarShown}
          transitionKey={transitionKey}
          animate={!resizing}
        >
          <View className="h-shell-bar" />
          <View className="min-h-0 flex-1 overflow-hidden">
            <View className="h-14 flex-row items-center gap-0.5 px-2">
              {listHeader}
            </View>
            {list}
          </View>
        </ShellPane>
        <ShellPane
          testID="desktop-detail"
          card
          offset={sidebarShown ? visibleListWidth : 0}
          width={Math.max(0, availableWidth - inspectorTargetWidth)}
          hidden={inspectorExpanded}
          transitionKey={transitionKey}
          animate={!resizing}
          header={
            <View className="h-shell-bar flex-row items-center gap-2 px-4">
              <ShellHeaderContent
                testID="desktop-detail-title"
                animate={!resizing}
                position={
                  sidebarShown ? visibleListWidth : hiddenSidebarTitleInset
                }
                transitionKey={transitionKey}
                inset={sidebarShown ? 0 : hiddenSidebarTitleInset}
              >
                {detailHeader}
              </ShellHeaderContent>
              <ShellHeaderActions
                testID="desktop-detail-actions"
                position={railWidth + usableWidth - inspectorTargetWidth}
                transitionKey={transitionKey}
                animate={!resizing}
              >
                {detailActions}
              </ShellHeaderActions>
            </View>
          }
        >
          <View className="h-shell-bar" />
          <ContentLayout className="overflow-hidden rounded-xl">
            {children}
          </ContentLayout>
        </ShellPane>
        <ShellPane
          testID="desktop-inspector"
          offset={usableWidth - inspectorTargetWidth}
          width={inspectorTargetWidth}
          hidden={!inspectorOpen}
          transitionKey={transitionKey}
          animate={!resizing}
          header={
            <View className="h-shell-bar flex-row items-center gap-2 pl-4 pr-1">
              <ShellHeaderContent
                testID="desktop-inspector-title"
                animate={!resizing}
                position={
                  usableWidth -
                  inspectorTargetWidth +
                  (!sidebarShown && inspectorExpanded
                    ? hiddenSidebarTitleInset
                    : 0)
                }
                transitionKey={transitionKey}
                inset={
                  !sidebarShown && inspectorExpanded
                    ? hiddenSidebarTitleInset
                    : 0
                }
              >
                {inspectorHeader}
              </ShellHeaderContent>
              <ShellHeaderActions
                testID="desktop-inspector-actions"
                position={railWidth + usableWidth}
                transitionKey={transitionKey}
                animate={!resizing}
              >
                <Button
                  variant="ghost"
                  className="size-8 p-0 sm:size-8"
                  accessibilityLabel={
                    inspectorExpanded ? 'Restore Inspector' : 'Expand Inspector'
                  }
                  onPress={() =>
                    onInspectorStateChange(
                      inspectorExpanded ? 'open' : 'expanded',
                    )
                  }
                >
                  <Icon
                    as={
                      inspectorExpanded
                        ? ArrowsInSimpleIcon
                        : ArrowsOutSimpleIcon
                    }
                    className="text-muted-foreground"
                  />
                </Button>
                <Button
                  variant="ghost"
                  className="size-8 p-0 sm:size-8"
                  accessibilityLabel="Close Inspector"
                  onPress={() => onInspectorStateChange('closed')}
                >
                  <Icon as={XIcon} className="text-muted-foreground" />
                </Button>
              </ShellHeaderActions>
            </View>
          }
        >
          <View className="h-shell-bar" />
          <ScrollFadeView
            testID="desktop-inspector-scroll"
            className={cn(
              'overflow-hidden',
              inspectorExpanded ? 'rounded-xl' : 'rounded-r-xl',
            )}
            contentContainerClassName="grow"
            surfaceClassName="bg-sidebar"
          >
            {inspector}
          </ScrollFadeView>
        </ShellPane>
      </View>
    </View>
  );
}
