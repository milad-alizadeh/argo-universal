import type * as React from 'react';
import { View } from 'react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../lib/generic/primitives/dropdown-menu';
import { IconButton } from '../../../lib/generic/primitives/icon-button';
import { Text } from '../../../lib/generic/primitives/text';
import { DesktopShell, type DesktopShellProps } from './desktop-shell';

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
}: Partial<DesktopShellProps>): React.JSX.Element {
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
        inspectorHeader={
          <Text className="text-sm font-semibold">Inspector</Text>
        }
        inspector={
          inspector ?? (
            <View className="p-4">
              <Text testID="inspector-content">{title} Inspector</Text>
            </View>
          )
        }
        listHeader={
          <Text
            role="heading"
            aria-level={2}
            className="text-base font-semibold"
          >
            {title}
          </Text>
        }
        list={
          <View className="p-4">
            <Text testID="list-content">{title} list</Text>
          </View>
        }
        detailHeader={
          <Text
            role="heading"
            aria-level={2}
            className="text-base font-semibold"
            numberOfLines={1}
          >
            {title} detail
          </Text>
        }
        detailActions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                variant="ghost"
                className="size-8 p-0 sm:size-8"
                accessibilityLabel="More actions"
                icon={'more'}
                iconSize={'md'}
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
      >
        {children ?? (
          <View className="flex-1 p-4">
            <Text testID="detail-content">{title} detail</Text>
          </View>
        )}
      </DesktopShell>
    </View>
  );
}
