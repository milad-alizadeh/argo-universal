import type { ChangesSummary } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';
import { changesTotals, filesSummary } from '../../view/changes-totals';
import type { ChangesViewProps } from '../../view/changes-view-props';
import { ComparisonPicker } from '../comparison-picker/comparison-picker';

/*
 * Under the Inspector's header, one row with the comparison in force, then at its end how many files are viewed and
 * the line totals. Until files load, only the comparison shows.
 */
export function ChangesToolbar(props: ChangesViewProps): React.JSX.Element {
  return (
    <SizeClass
      compact={<Summary {...props} />}
      medium={<ComparisonRow {...props} />}
      wide={<ComparisonRow {...props} />}
    />
  );
}

// A long comparison name gives way to the counts only when the row runs out of room.
function ComparisonRow(props: ChangesViewProps): React.JSX.Element {
  const counted = countedOf(props);

  return (
    <View className="h-11 flex-row items-center gap-2 px-2 wide:px-3">
      <View className="min-w-0 shrink">
        <ComparisonPicker {...props} />
      </View>
      <View className="flex-1" />
      {counted ? <RowCounts {...counted} /> : null}
    </View>
  );
}

function RowCounts(props: Counted): React.JSX.Element {
  return (
    <>
      <View className="min-w-0 shrink">
        <FileCounts {...props} />
      </View>
      <LineTotals {...props.summary} />
    </>
  );
}

// The phone's sheet has no comparison pill, so its counts take their own line.
function Summary(props: ChangesViewProps): React.JSX.Element | null {
  const counted = countedOf(props);

  if (!counted) return null;

  return (
    <View className="px-4 pt-4 pb-2">
      <FileCounts {...counted} />
    </View>
  );
}

type Counted = Pick<ChangesViewProps, 'files' | 'viewed'> & {
  summary: ChangesSummary;
};

// The counts show once the comparison has files to count.
const countedOf = (props: ChangesViewProps): Counted | undefined =>
  props.summary?.files
    ? { files: props.files, viewed: props.viewed, summary: props.summary }
    : undefined;

function FileCounts(props: Counted): React.JSX.Element {
  return (
    <Text role="secondary" tone="muted" numberOfLines={1}>
      {filesSummary(changesTotals(props.summary, props.files, props.viewed))}
    </Text>
  );
}

const lines = (count: number): string => count.toLocaleString('en-US');

function LineTotals(totals: ChangesSummary): React.JSX.Element {
  return (
    <View className="shrink-0 flex-row gap-2 pr-2">
      <Text role="badge" tone="success">{`+${lines(totals.additions)}`}</Text>
      <Text role="badge" tone="danger">{`−${lines(totals.deletions)}`}</Text>
    </View>
  );
}
