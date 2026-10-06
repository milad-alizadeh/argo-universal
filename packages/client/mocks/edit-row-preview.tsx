import type { ToolCallUpdate } from '@repo/contracts';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { DesktopShell } from '../src/components/DesktopShell';
import { EditRow } from '../src/components/EditRow';
import { useWide } from '../src/navigation/use-wide';
import { Text } from '../src/primitives/text';

export function EditRowPreview({ row }: { row: ToolCallUpdate }) {
  const wide = useWide();
  const [sidebarShown, setSidebarShown] = useState(true);
  const feed = (
    <ScrollView
      className="flex-1"
      contentContainerClassName="p-gutter wide:p-6"
    >
      <View testID="edit-feed">
        <EditRow row={row} />
      </View>
    </ScrollView>
  );
  if (!wide) return <View className="flex-1 bg-card">{feed}</View>;
  return (
    <DesktopShell
      selectedSection="sessions"
      attentionCount={0}
      sidebarShown={sidebarShown}
      onSidebarShownChange={setSidebarShown}
      onSectionChange={() => {}}
      listHeader={<Text className="text-base font-semibold">Sessions</Text>}
      list={null}
      detailHeader={<Text className="text-sm">Recorded edits</Text>}
      inspectorHeader={null}
      inspector={null}
      inspectorState="closed"
      onInspectorStateChange={() => {}}
    >
      {feed}
    </DesktopShell>
  );
}
