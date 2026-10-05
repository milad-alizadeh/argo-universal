import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  DesktopShell,
  type DesktopShellProps,
} from '../src/components/DesktopShell';
import { Button } from '../src/primitives/button';
import { Text } from '../src/primitives/text';

export function DesktopShellMock({
  selectedSection = 'sessions',
  attentionCount = 1,
  sidebarShown = true,
  inspectorState = 'closed',
}: Partial<DesktopShellProps>) {
  const [section, setSection] = useState(selectedSection);
  const [shown, setShown] = useState(sidebarShown);
  const [inspection, setInspection] = useState(inspectorState);
  useEffect(() => setSection(selectedSection), [selectedSection]);
  useEffect(() => setShown(sidebarShown), [sidebarShown]);
  useEffect(() => setInspection(inspectorState), [inspectorState]);
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  return (
    <DesktopShell
      selectedSection={section}
      attentionCount={attentionCount}
      sidebarShown={shown}
      onSidebarShownChange={setShown}
      onSectionChange={setSection}
      inspectorState={inspection}
      onInspectorStateChange={setInspection}
      inspectorHeader={<Text className="text-sm font-semibold">Inspector</Text>}
      inspector={
        <View className="p-4">
          <Text testID="inspector-content">{title} Inspector</Text>
        </View>
      }
      listHeader={
        <Text role="heading" aria-level={2} className="text-base font-semibold">
          {title}
        </Text>
      }
      list={
        <View className="p-4">
          <Text testID="list-content">{title} list</Text>
        </View>
      }
      detailHeader={
        <View className="flex-row items-center gap-2">
          <Text
            role="heading"
            aria-level={2}
            className="min-w-0 flex-1 text-base font-semibold"
            numberOfLines={1}
          >
            {title} detail
          </Text>
          {inspection === 'closed' && (
            <Button
              variant="ghost"
              size="sm"
              className="min-w-0 shrink"
              accessibilityLabel="Open Inspector"
              onPress={() => setInspection('open')}
            >
              <Text numberOfLines={1}>Changed files</Text>
            </Button>
          )}
        </View>
      }
    >
      <View className="flex-1 p-4">
        <Text testID="detail-content">{title} detail</Text>
      </View>
    </DesktopShell>
  );
}
