import type { ChangesSummary } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { PhonePill } from '@repo/kit/primitives/status/pill';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { Pressable } from 'react-native';

const count = (value: number): string => value.toLocaleString('en-US');

const filesLabel = (files: number): string =>
  `${count(files)} ${files === 1 ? 'file' : 'files'}`;

const pillLabel = (summary: ChangesSummary): string =>
  `Changes, ${filesLabel(summary.files)}, ${count(summary.additions)} lines added, ${count(summary.deletions)} removed`;

// Whether the Checkout has changes to offer: no files, or no summary yet, and the pill is not drawn.
export const hasChanges = (
  summary: ChangesSummary | undefined,
): summary is ChangesSummary => !!summary?.files;

export interface ChangesPillProps {
  // The Checkout's changes, as the Inspector's Files view counts them; never a pull request's.
  summary: ChangesSummary;
  onPress: () => void;
}

// The added and removed lines, in the Workbench's colours.
function LineTotals({ summary }: { summary: ChangesSummary }): ReactElement {
  return (
    <>
      <Text role="control" tone="success">
        +{count(summary.additions)}
      </Text>
      <Text role="control" tone="danger">
        −{count(summary.deletions)}
      </Text>
    </>
  );
}

const pressableProps = ({
  summary,
  onPress,
}: ChangesPillProps): React.ComponentProps<typeof Pressable> => ({
  role: 'button',
  hitSlop: 6,
  accessibilityLabel: pillLabel(summary),
  onPress,
});

// The Composer's entry to the Changes: the Checkout's files and line totals, one press from the Inspector's Changes tab.
export function ChangesPill(props: ChangesPillProps): ReactElement {
  return (
    <PhonePill {...pressableProps(props)}>
      <Icon name="diff" tone="neutral" />
      <Text role="control" tone="muted">
        {filesLabel(props.summary.files)}
      </Text>
      <LineTotals summary={props.summary} />
    </PhonePill>
  );
}
