import type { ToolCallUpdate } from '@repo/contracts';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { Page } from '#primitives/scaffolds/page';
import { ScaffoldMock } from '../../../../../mocks/scaffold';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
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
      <Page title="Recorded edits">{children}</Page>
    </ScaffoldMock>
  );
}

interface EditRowPreviewProps {
  row: ToolCallUpdate;
}

export function EditRowPreview({
  row,
}: EditRowPreviewProps): React.JSX.Element {
  const feed = <EditFeed row={row} />;

  return (
    <SizeClass
      compact={<View className="flex-1 bg-card">{feed}</View>}
      wide={<WidePreview>{feed}</WidePreview>}
    />
  );
}
