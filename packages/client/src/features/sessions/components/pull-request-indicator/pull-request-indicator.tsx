import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';

export const pullRequestAppearance = {
  open: { icon: 'pr-open', tone: 'success' },
  draft: { icon: 'pr-draft', tone: 'muted' },
  merged: { icon: 'pr-merged', tone: 'done' },
  conflict: { icon: 'pr-conflict', tone: 'warning' },
  closed: { icon: 'pr-closed', tone: 'danger' },
} as const;

export const pullRequestStatusLabels = {
  open: 'Open',
  draft: 'Draft',
  merged: 'Merged',
  conflict: 'Conflict',
  closed: 'Closed',
} satisfies Record<PullRequestStatus, string>;

export type PullRequestStatus = keyof typeof pullRequestAppearance;

export interface PullRequestIndicatorProps {
  number: number;
  status: PullRequestStatus;
}

// The PR's glyph in its state colour, sized beside Secondary text.
export function PullRequestIcon({
  status,
}: Pick<PullRequestIndicatorProps, 'status'>): React.JSX.Element {
  const appearance = pullRequestAppearance[status];

  return (
    <Icon role="secondary" name={appearance.icon} tone={appearance.tone} />
  );
}

function PullRequestNumber({
  number,
  status,
}: PullRequestIndicatorProps): React.JSX.Element {
  return (
    <Text role="secondary" tone={pullRequestAppearance[status].tone}>
      #{number}
    </Text>
  );
}

export function PullRequestIndicator(
  props: PullRequestIndicatorProps,
): React.JSX.Element {
  return (
    <View
      accessibilityLabel={`${props.status} PR #${props.number}`}
      className="flex-row items-center gap-1.5"
    >
      <PullRequestIcon {...props} />
      <PullRequestNumber {...props} />
    </View>
  );
}
