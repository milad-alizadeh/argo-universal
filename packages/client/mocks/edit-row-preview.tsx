import type { ToolCallUpdate } from '@repo/contracts';
import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import { EditRow } from '../src/features/feed/components/edit-row';
import { DesktopShell } from '../src/features/frame/components/desktop-shell';
import { Text } from '../src/lib/generic/primitives/text';
import { useWide } from '../src/lib/generic/use-wide';

export function EditRowPreview({
  row,
}: {
  row: ToolCallUpdate;
}): React.JSX.Element {
  const wide = useWide();
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
      sidebarShown={true}
      onSidebarShownChange={() => {}}
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
