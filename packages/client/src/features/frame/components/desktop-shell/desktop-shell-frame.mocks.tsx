import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { IconButton } from '../../../../lib/generic/primitives/buttons/icon-button/icon-button';
import { Text } from '../../../../lib/generic/primitives/display/text/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../lib/generic/primitives/overlays/dropdown-menu/dropdown-menu';
import { ListTitle } from '../../../../lib/product/list-title';
import { PageHeader } from '../../../../lib/product/page-header';
import { InspectorPane } from '../inspector-pane';
import { DesktopShell, type DesktopShellProps } from './desktop-shell';

export type DesktopShellFrameProps = Partial<
  Omit<DesktopShellProps, 'inspector'>
> & {
  // The Inspector's content, under its header.
  inspector?: ReactNode;
};

export function DesktopShellFrame({
  selectedSection = 'sessions',
  attentionCount = 1,
  sidebarShown = true,
  inspectorState = 'closed',
  inspector,
  children,
  onSectionChange = () => {},
  onSidebarShownChange = () => {},
  onInspectorStateChange = () => {},
}: DesktopShellFrameProps): React.JSX.Element {
  const title =
    selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1);
  return (
    <View className="flex-1">
      <DesktopShell
        selectedSection={selectedSection}
        attentionCount={attentionCount}
        sidebarShown={sidebarShown}
        onSidebarShownChange={onSidebarShownChange}
        onSectionChange={onSectionChange}
        inspectorState={inspectorState}
        onInspectorStateChange={onInspectorStateChange}
        inspector={(expanded) => (
          <InspectorPane
            title="Inspector"
            expanded={expanded}
            onStateChange={onInspectorStateChange}
          >
            {inspector ?? (
              <View className="p-4">
                <Text testID="inspector-content">{title} Inspector</Text>
              </View>
            )}
          </InspectorPane>
        )}
        listHeader={<ListTitle>{title}</ListTitle>}
        list={
          <View className="p-4">
            <Text testID="list-content">{title} list</Text>
          </View>
        }
      >
        {children ?? (
          <View className="flex-1">
            <PageHeader
              title={`${title} page`}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton
                      variant="ghost"
                      className="size-7 p-0 sm:size-7"
                      accessibilityLabel="More actions"
                      icon={'more'}
                      iconClassName={'text-muted-foreground'}
                      size="md"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Text>Example action</Text>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
            <View className="flex-1 p-4">
              <Text testID="detail-content">{title} detail</Text>
            </View>
          </View>
        )}
      </DesktopShell>
    </View>
  );
}
