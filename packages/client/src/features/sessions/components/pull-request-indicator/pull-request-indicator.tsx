import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text/text';
import { Icon } from '../../../../lib/generic/symbols/icon';

const pullRequest = 'pull-request';

export const pullRequestAppearance = {
  open: { icon: pullRequest, className: 'text-success' },
  draft: { icon: pullRequest, className: 'text-muted-foreground' },
  merged: { icon: 'merged', className: 'text-merged' },
  conflict: { icon: pullRequest, className: 'text-warning' },
  closed: { icon: pullRequest, className: 'text-destructive' },
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

function PullRequestIcon({
  status,
}: PullRequestIndicatorProps): React.JSX.Element {
  const appearance = pullRequestAppearance[status];

  return (
    <Icon
      role="secondary"
      name={appearance.icon}
      className={cn('shrink-0', appearance.className)}
    />
  );
}

function PullRequestNumber({
  number,
  status,
}: PullRequestIndicatorProps): React.JSX.Element {
  return (
    <Text
      role="secondary"
      className={cn(pullRequestAppearance[status].className)}
    >
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
      className="flex-row items-center gap-1"
    >
      <PullRequestIcon {...props} />
      <PullRequestNumber {...props} />
    </View>
  );
}
