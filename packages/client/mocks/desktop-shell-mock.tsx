import { DotsThreeIcon } from 'phosphor-react-native/src/icons/DotsThree';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  DesktopShell,
  type DesktopShellProps,
} from '../src/components/desktop-shell';
import { Icon } from '../src/components/icon';
import { Button } from '../src/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../src/primitives/dropdown-menu';
import { Text } from '../src/primitives/text';

export function DesktopShellMock({
  selectedSection = 'sessions',
  attentionCount = 1,
  sidebarShown = true,
  inspectorState = 'closed',
  showInspectorControls = false,
  inspector,
  children,
}: Partial<DesktopShellProps> & { showInspectorControls?: boolean }) {
  const [section, setSection] = useState(selectedSection);
  const [shown, setShown] = useState(sidebarShown);
  const [inspection, setInspection] = useState(inspectorState);
  useEffect(() => setSection(selectedSection), [selectedSection]);
  useEffect(() => setShown(sidebarShown), [sidebarShown]);
  useEffect(() => setInspection(inspectorState), [inspectorState]);
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  return (
    <View className="flex-1">
      <DesktopShell
        selectedSection={section}
        attentionCount={attentionCount}
        sidebarShown={shown}
        onSidebarShownChange={setShown}
        onSectionChange={setSection}
        inspectorState={inspection}
        onInspectorStateChange={setInspection}
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
              <Button
                variant="ghost"
                className="size-8 p-0 sm:size-8"
                accessibilityLabel="More actions"
              >
                <Icon
                  as={DotsThreeIcon}
                  className="size-4 text-muted-foreground"
                />
              </Button>
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
      {showInspectorControls && (
        <Button
          accessibilityLabel="Open Inspector"
          onPress={() => setInspection('open')}
        >
          <Text>Open Inspector</Text>
        </Button>
      )}
    </View>
  );
}
