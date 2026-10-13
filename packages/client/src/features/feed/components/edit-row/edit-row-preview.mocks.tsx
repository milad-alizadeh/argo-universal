import type { ToolCallUpdate } from '@repo/contracts';
import type * as React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { DesktopShell } from '#features/frame';
import { Text } from '../../../../lib/generic/primitives/display/text/text';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { PageHeader } from '../../../../lib/product/page-header';
import { EditRow } from './edit-row';

const ignore = (): void => {};

const shellProps = {
  selectedSection: 'sessions',
  attentionCount: 0,
  sidebarShown: true,
  onSidebarShownChange: ignore,
  onSectionChange: ignore,
  listHeader: <Text role={'heading'}>Sessions</Text>,
  list: null,
  inspector: (): null => null,
  inspectorState: 'closed',
  onInspectorStateChange: ignore,
} satisfies Omit<ComponentProps<typeof DesktopShell>, 'children'>;

function EditFeed({ row }: { row: ToolCallUpdate }): React.JSX.Element {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="p-gutter wide:p-6"
    >
      <View testID="edit-feed">
        <EditRow row={row} />
      </View>
    </ScrollView>
  );
}

function WidePreview({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <DesktopShell {...shellProps}>
      <View className="flex-1">
        <PageHeader title="Recorded edits" />
        {children}
      </View>
    </DesktopShell>
  );
}

export function EditRowPreview({
  row,
}: {
  row: ToolCallUpdate;
}): React.JSX.Element {
  const wide = useWide();
  const feed = <EditFeed row={row} />;

  if (!wide) return <View className="flex-1 bg-card">{feed}</View>;

  return <WidePreview>{feed}</WidePreview>;
}
