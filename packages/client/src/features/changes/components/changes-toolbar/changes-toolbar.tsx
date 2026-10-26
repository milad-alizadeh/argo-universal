import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';
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
    <SizeClass
      compact={<Summary files={props.files} viewed={props.viewed} />}
      medium={<DesktopToolbar {...props} />}
      wide={<DesktopToolbar {...props} />}
    />
  );
}

function DesktopToolbar(props: ChangesViewProps): React.JSX.Element {
  if (props.selectedFile) return <BackRow {...props} />;

  return (
    <View>
      <ComparisonRow {...props} />
      <Summary {...props} />
    </View>
  );
}

function ComparisonRow(props: ChangesViewProps): React.JSX.Element {
  return (
    <View className="h-11 flex-row items-center gap-2 px-2 wide:px-3">
      <View className="min-w-0 flex-1">
        <ComparisonPicker {...props} />
      </View>
      {props.files && (
        <LineTotals {...changesTotals(props.files, props.viewed)} />
      )}
    </View>
  );
}

function Summary(
  props: Pick<ChangesViewProps, 'files' | 'viewed'>,
): React.JSX.Element | null {
  if (!props.files?.length) return null;

  const totals = changesTotals(props.files, props.viewed);

  return (
    <View className="flex-row items-center gap-2 px-4 wide:px-5 pt-4 pb-2 medium:h-6 medium:bg-content medium:py-0">
      <FileCounts {...totals} />
    </View>
  );
}

function FileCounts(totals: ChangesTotals): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text role="secondary" tone="muted" numberOfLines={1}>
        {filesSummary(totals)}
      </Text>
    </View>
  );
}

const lines = (count: number): string => count.toLocaleString('en-US');

function LineTotals(totals: ChangesTotals): React.JSX.Element {
  return (
    <View className="flex-row gap-2 pr-2">
      <Text role="badge" tone="success">{`+${lines(totals.added)}`}</Text>
      <Text role="badge" tone="danger">{`−${lines(totals.removed)}`}</Text>
    </View>
  );
}

// Back and the file's name: Back's glyph shares its centre line with the file rows' icons and chevrons below it.
function BackRow(props: ChangesViewProps): React.JSX.Element {
  return (
    <View className="h-11 flex-row items-center gap-4 wide:gap-3 px-4 wide:px-5">
      <IconButton
        icon="back"
        size="sm"
        variant="ghost"
        muted
        accessibilityLabel="Back"
        onPress={() => props.onFileSelect?.()}
      />
      <FileTitle path={props.selectedFile} />
    </View>
  );
}

function FileTitle({ path = '' }: { path?: string }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text
        role="heading"
        accessibilityRole="heading"
        aria-level={3}
        numberOfLines={1}
      >
        {path.slice(path.lastIndexOf('/') + 1)}
      </Text>
    </View>
  );
}
