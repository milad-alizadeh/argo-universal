import type { ToolCallUpdate } from '@repo/contracts';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ScaffoldMock } from '../../../../../mocks/scaffold';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { PageHeader } from '../../../../lib/product/page-header';
import { EditRow } from './edit-row';

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
    <ScaffoldMock attentionCount={0}>
      <View className="flex-1">
        <PageHeader title="Recorded edits" />
        {children}
      </View>
    </ScaffoldMock>
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
