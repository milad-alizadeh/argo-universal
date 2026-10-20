import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import {
  changesTotals,
  filesSummary,
  type ChangesTotals,
} from '../../view/changes-totals';
import type { ChangesViewProps } from '../../view/changes-view-props';
import { ComparisonPicker } from '../comparison-picker/comparison-picker';

/*
 * Paper (Flow / Changes comparison): under the Inspector's header, the comparison in force, then how many files
 * and how many are viewed, with the line totals at the end. Until files load, only the comparison shows.
 */
export function ChangesToolbar(props: ChangesViewProps): React.JSX.Element {
  return (
    <View>
      <View className="flex-row px-4 py-2">
        <ComparisonPicker {...props} />
      </View>
      <Summary files={props.files} viewed={props.viewed} />
    </View>
  );
}

function Summary(
  props: Pick<ChangesViewProps, 'files' | 'viewed'>,
): React.JSX.Element | null {
  if (!props.files?.length) return null;

  const totals = changesTotals(props.files, props.viewed);

  return (
    <View className="h-11 flex-row items-center gap-2 px-4 medium:bg-content medium:px-3">
      <FileCounts {...totals} />
      <DesktopLineTotals {...totals} />
    </View>
  );
}

function DesktopLineTotals(totals: ChangesTotals): React.JSX.Element {
  const lines = <LineTotals {...totals} />;

  return <SizeClass compact={null} medium={lines} wide={lines} />;
}

function FileCounts(totals: ChangesTotals): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text
        role={{ compact: 'heading', medium: 'secondary', wide: 'secondary' }}
        tone="muted"
        numberOfLines={1}
      >
        {filesSummary(totals)}
      </Text>
    </View>
  );
}

const lines = (count: number): string => count.toLocaleString('en-US');

function LineTotals(totals: ChangesTotals): React.JSX.Element {
  return (
    <View className="flex-row gap-2">
      <Text role="badge" tone="success">{`+${lines(totals.added)}`}</Text>
      <Text role="badge" tone="danger">{`−${lines(totals.removed)}`}</Text>
    </View>
  );
}
