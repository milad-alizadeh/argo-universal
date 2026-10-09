import { type CompactionUpdate, type Notice } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { FeedContent } from './feed-content';

const noticeLabels: ReadonlyMap<string, string> = new Map([
  ['info', 'Information'],
  ['warning', 'Warning'],
  ['error', 'Error'],
]);
const compactionLabels: ReadonlyMap<string, string> = new Map(
  Object.entries({
    in_progress: 'Compacting context',
    completed: 'Context compacted',
    failed: 'Compaction failed',
    cancelled: 'Compaction stopped',
  }),
);
export function FeedNotice({ row }: { row: Notice }): React.JSX.Element {
  return (
    <View
      role={row.severity === 'error' ? 'alert' : 'status'}
      className="gap-1 border-l-2 border-border pl-3"
    >
      <Text className="text-sm font-medium text-foreground">{row.title}</Text>
      {!!row.description && (
        <Text className="text-sm text-muted-foreground">{row.description}</Text>
      )}
      <Text className="text-sm text-muted-foreground">
        {noticeLabels.get(row.severity) ?? `Unknown severity: ${row.severity}`}
      </Text>
    </View>
  );
}
export function FeedCompaction({
  row,
}: {
  row: CompactionUpdate;
}): React.JSX.Element {
  return (
    <View className="gap-2 border-l-2 border-border pl-3">
      <Text role="status" className="text-sm font-medium text-muted-foreground">
        {compactionLabels.get(row.status) ??
          `Unknown compaction status: ${row.status}`}
      </Text>
      {!!row.summary?.length && (
        <FeedContent
          content={row.summary}
          streaming={row.status === 'in_progress'}
        />
      )}
      {!!row.error && (
        <Text className="text-sm text-destructive">{row.error}</Text>
      )}
    </View>
  );
}
