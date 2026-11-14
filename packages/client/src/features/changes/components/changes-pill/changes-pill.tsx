import type { ChangesSummary } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { LiquidGlass } from '@repo/kit/primitives/content/liquid-glass';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { Pressable } from 'react-native';

// The floating material Jump to latest draws, as a pill that grows to its content.
const pillSurface = {
  corners: 'pill',
  interactive: true,
  inherit: true,
  className: 'h-8',
} as const;

const pillClassName =
  'h-8 flex-row items-center gap-2 rounded-full pr-3.5 pl-3 active:opacity-70';

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
  className: pillClassName,
});

// The Composer's entry to the Changes: the Checkout's files and line totals, one press from the Inspector's Changes tab.
export function ChangesPill(props: ChangesPillProps): ReactElement {
  return (
    <LiquidGlass {...pillSurface}>
      <Pressable {...pressableProps(props)}>
        <Icon name="diff" tone="neutral" />
        <Text role="control" tone="muted">
          {filesLabel(props.summary.files)}
        </Text>
        <LineTotals summary={props.summary} />
      </Pressable>
    </LiquidGlass>
  );
}
