import { GitMergeIcon, GitPullRequestIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Icon } from './Icon';

const statusAppearance = {
  open: { icon: GitPullRequestIcon, className: 'text-success' },
  draft: { icon: GitPullRequestIcon, className: 'text-muted-foreground' },
  merged: { icon: GitMergeIcon, className: 'text-merged' },
  conflict: { icon: GitPullRequestIcon, className: 'text-warning' },
  closed: { icon: GitPullRequestIcon, className: 'text-destructive' },
};

export interface PullRequestIndicatorProps {
  number: number;
  status: keyof typeof statusAppearance;
}

export function PullRequestIndicator({
  number,
  status,
}: PullRequestIndicatorProps) {
  const appearance = statusAppearance[status];
  return (
    <View
      accessibilityLabel={`${status} PR #${number}`}
      className="flex-row items-center gap-1"
    >
      <Icon
        as={appearance.icon}
        className={cn('size-3.5 shrink-0', appearance.className)}
      />
      <Text
        className={cn('text-xs font-normal leading-4', appearance.className)}
      >
        #{number}
      </Text>
    </View>
  );
}
