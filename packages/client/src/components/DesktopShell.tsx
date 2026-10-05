import { ArrowsInSimpleIcon } from 'phosphor-react-native/src/icons/ArrowsInSimple';
import { ArrowsOutSimpleIcon } from 'phosphor-react-native/src/icons/ArrowsOutSimple';
import { SidebarSimpleIcon } from 'phosphor-react-native/src/icons/SidebarSimple';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { cn } from '#lib/utils';
import { Badge } from '#primitives/badge';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from './Icon';
import { PanelResizeHandle } from './PanelResizeHandle';
import { ShellPane } from './ShellPane';
import { type ShellSection, shellSections } from './shell-sections';

export interface DesktopShellProps {
  selectedSection: ShellSection;
  attentionCount: number;
  sidebarShown: boolean;
  onSidebarShownChange: (shown: boolean) => void;
  onSectionChange: (section: ShellSection) => void;
  listHeader: ReactNode;
  list: ReactNode;
  detailHeader: ReactNode;
  children: ReactNode;
  inspectorState: InspectorState;
  onInspectorStateChange: (state: InspectorState) => void;
  inspectorHeader: ReactNode;
  inspector: ReactNode;
}

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
  const detailMinimum = Number.parseFloat(
    String(useCSSVariable('--spacing-shell-detail-minimum')),
  );
  const railWidth = Number.parseFloat(
    String(useCSSVariable('--spacing-shell-rail')),
  );
  const inset = Number.parseFloat(
    String(useCSSVariable('--spacing-shell-inset')),
  );
  const listMaximum = Number.parseFloat(
    String(useCSSVariable('--spacing-shell-list-maximum')),
  );
  const [preferredListWidth, setPreferredListWidth] = useState(listWidth);
  const [preferredInspectorWidth, setPreferredInspectorWidth] =
    useState(inspectorWidth);
  const [width, setWidth] = useState(0);
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
  const inspectorTargetWidth = inspectorOpen
    ? inspectorExpanded
      ? availableWidth
      : visibleInspectorWidth
    : 0;

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

  function sectionButton(section: ShellSection) {
    const { title, icon } = shellSections[section];
    return (
      <Button
        key={section}
        variant="ghost"
        className={cn(
          'size-10 rounded-lg p-0',
          selectedSection === section &&
            'border border-border bg-card shadow-sm',
        )}
        accessibilityLabel={title}
        accessibilityState={{ selected: selectedSection === section }}
        aria-selected={selectedSection === section}
        onPress={() => onSectionChange(section)}
      >
        <Icon as={icon} className="size-5" />
        {section === 'sessions' && attentionCount > 0 && (
          <Badge
            className="absolute -right-1 -top-1 min-w-4 border-0 bg-warning px-1 py-0"
            accessibilityLabel={`${attentionCount} ${attentionCount === 1 ? 'Session needs' : 'Sessions need'} attention`}
          >
            <Text className="text-[10px] font-semibold text-warning-foreground">
              {attentionCount > 99 ? '99+' : attentionCount}
            </Text>
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <View
      testID="desktop-shell"
      className="flex-1 flex-row overflow-hidden bg-shell-chrome"
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      <View className="absolute left-shell-rail top-0 z-20 h-shell-header w-12 items-start justify-center pl-1">
        <Button
          variant="ghost"
          className="size-8 p-0 sm:size-8"
          accessibilityLabel={sidebarShown ? 'Hide sidebar' : 'Show sidebar'}
          onPress={() => onSidebarShownChange(!sidebarShown)}
        >
          <Icon
            as={SidebarSimpleIcon}
            className="size-4 text-muted-foreground"
          />
        </Button>
      </View>
      <View testID="desktop-rail" className="w-shell-rail items-center pb-3">
        <View className="h-shell-header" />
        <View className="gap-2">
          {(['sessions', 'issues', 'atlas'] as const).map(sectionButton)}
        </View>
        <View className="flex-1" />
        {sectionButton('settings')}
      </View>
      {!sidebarShown && listLimit > listWidth && (
        <View className="absolute left-shell-rail top-0 bottom-shell-inset z-10">
          <PanelResizeHandle
            label="Resize sidebar"
            value={0}
            minimum={0}
            maximum={Math.min(listMaximum, listLimit)}
            direction={1}
            onChange={resizeList}
          />
        </View>
      )}
      <View className="min-w-0 flex-1 flex-row pb-shell-inset pr-shell-inset">
        <View
          pointerEvents="none"
          className="absolute bottom-shell-inset left-0 right-shell-inset top-shell-header rounded-xl bg-sidebar"
        />
        <ShellPane
          testID="desktop-list"
          width={sidebarShown ? visibleListWidth : 0}
          hidden={!sidebarShown}
          transitionKey={transitionKey}
        >
          <View className="h-shell-header" />
          <View className="min-h-0 flex-1 overflow-hidden">
            <View className="h-14 justify-center px-4">{listHeader}</View>
            {list}
          </View>
          {sidebarShown && listLimit > listWidth && (
            <PanelResizeHandle
              label="Resize sidebar"
              value={visibleListWidth}
              minimum={Math.min(listWidth, listLimit)}
              maximum={Math.min(listMaximum, listLimit)}
              direction={1}
              onChange={resizeList}
            />
          )}
        </ShellPane>
        <ShellPane
          testID="desktop-detail"
          width={Math.max(0, availableWidth - inspectorTargetWidth)}
          hidden={inspectorExpanded}
          transitionKey={transitionKey}
        >
          <View
            className={cn(
              'h-shell-header overflow-hidden flex-row items-center gap-2 px-4',
              !sidebarShown && 'pl-12',
            )}
          >
            <View className="min-w-0 flex-1">{detailHeader}</View>
          </View>
          <View className="min-h-0 flex-1 overflow-hidden rounded-xl bg-card shadow-card">
            {children}
          </View>
          {!inspectorOpen && (
            <PanelResizeHandle
              label="Resize Inspector"
              value={0}
              minimum={0}
              maximum={availableWidth}
              direction={-1}
              onChange={resizeInspector}
            />
          )}
        </ShellPane>
        <ShellPane
          testID="desktop-inspector"
          width={inspectorTargetWidth}
          hidden={!inspectorOpen}
          transitionKey={transitionKey}
        >
          <View
            className={cn(
              'h-shell-header overflow-hidden flex-row items-center gap-2 pl-4 pr-1',
              !sidebarShown && inspectorExpanded && 'pl-12',
            )}
          >
            <View className="min-w-0 flex-1">{inspectorHeader}</View>
            <View className="flex-row items-center gap-0.5">
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
                    inspectorExpanded ? ArrowsInSimpleIcon : ArrowsOutSimpleIcon
                  }
                  className="size-4 text-muted-foreground"
                />
              </Button>
              <Button
                variant="ghost"
                className="size-8 p-0 sm:size-8"
                accessibilityLabel="Close Inspector"
                onPress={() => onInspectorStateChange('closed')}
              >
                <Icon as={XIcon} className="size-4 text-muted-foreground" />
              </Button>
            </View>
          </View>
          <View className="min-h-0 flex-1 overflow-hidden">{inspector}</View>
          {inspectorOpen && (
            <PanelResizeHandle
              label="Resize Inspector"
              edge="left"
              value={inspectorTargetWidth}
              minimum={0}
              maximum={availableWidth}
              direction={-1}
              onChange={resizeInspector}
            />
          )}
        </ShellPane>
      </View>
    </View>
  );
}
