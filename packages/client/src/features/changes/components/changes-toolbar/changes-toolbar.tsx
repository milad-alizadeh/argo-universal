import { Text } from '@repo/kit/primitives/content/text';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';
import { changesTotals, filesSummary } from '../../view/changes-totals';
import type {
  ChangesSummary,
  ChangesViewProps,
} from '../../view/changes-view-props';
import { ComparisonPicker } from '../comparison-picker/comparison-picker';

/*
 * Paper (Flow / Changes comparison): under the Inspector's header, one row with the comparison in force, then at its
 * end how many files are viewed and the line totals. Until files load, only the comparison shows.
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

// A long comparison name truncates at the pill's cap, a share of the row: whole in a wide Stage, the totals always shown.
function ComparisonRow(props: ChangesViewProps): React.JSX.Element {
  return (
    <View className="h-11 flex-row items-center gap-2 px-2 wide:px-3">
      <View className="min-w-0 max-w-3/4 shrink">
        <ComparisonPicker {...props} />
      </View>
      <View className="flex-1" />
      <View className="min-w-0 shrink">
        <FileCounts {...props} />
      </View>
      {props.summary?.files ? <LineTotals {...props.summary} /> : null}
    </View>
  );
}

// The phone's sheet has no comparison pill, so its counts take their own line.
function Summary(props: CountsProps): React.JSX.Element | null {
  if (!props.summary?.files) return null;

  return (
    <View className="px-4 pt-4 pb-2">
      <FileCounts {...props} />
    </View>
  );
}

type CountsProps = Pick<ChangesViewProps, 'files' | 'summary' | 'viewed'>;

function FileCounts(props: CountsProps): React.JSX.Element | null {
  if (!props.summary?.files) return null;

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
      <Text role="badge" tone="success">{`+${lines(totals.added)}`}</Text>
      <Text role="badge" tone="danger">{`−${lines(totals.removed)}`}</Text>
    </View>
  );
}
