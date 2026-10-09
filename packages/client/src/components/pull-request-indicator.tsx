import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';

const pullRequest = 'pull-request';

const statusAppearance = {
  open: { icon: pullRequest, className: 'text-success' },
  draft: { icon: pullRequest, className: 'text-muted-foreground' },
  merged: { icon: 'merged', className: 'text-merged' },
  conflict: { icon: pullRequest, className: 'text-warning' },
  closed: { icon: pullRequest, className: 'text-destructive' },
} as const;

export interface PullRequestIndicatorProps {
  number: number;
  status: keyof typeof statusAppearance;
}

export function PullRequestIndicator({
  number,
  status,
}: PullRequestIndicatorProps): React.JSX.Element {
  const appearance = statusAppearance[status];
  return (
    <View
      accessibilityLabel={`${status} PR #${number}`}
      className="flex-row items-center gap-1"
    >
      <Icon
        name={appearance.icon}
        className={cn('shrink-0', appearance.className)}
      />
      <Text
        className={cn('text-xs font-normal leading-4', appearance.className)}
      >
        #{number}
      </Text>
    </View>
  );
}
