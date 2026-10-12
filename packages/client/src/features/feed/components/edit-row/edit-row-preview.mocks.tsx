import type { ToolCallUpdate } from '@repo/contracts';
import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import { DesktopShell } from '#features/frame';
import { Text } from '../../../../lib/generic/primitives/display/text/text';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { PageHeader } from '../../../../lib/product/page-header';
import { EditRow } from './edit-row';

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
      inspector={() => null}
      inspectorState="closed"
      onInspectorStateChange={() => {}}
    >
      <View className="flex-1">
        <PageHeader title="Recorded edits" />
        {feed}
      </View>
    </DesktopShell>
  );
}
