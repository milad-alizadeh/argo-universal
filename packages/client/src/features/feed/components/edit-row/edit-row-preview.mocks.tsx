import type { ToolCallUpdate } from '@repo/contracts';
import { Page } from '@repo/kit/primitives/scaffolds/page';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ScaffoldMock } from '../../../../../mocks/scaffold';
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
