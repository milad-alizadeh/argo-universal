import type * as React from 'react';
import { View } from 'react-native';
import { MenuButton } from '#lib/generic/primitives/buttons/menu-button/menu-button';
import { Text } from '#lib/generic/primitives/display/text/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#lib/generic/primitives/overlays/dropdown-menu/dropdown-menu';
import { cn } from '#lib/generic/utils';
import { Icon } from '../../../lib/generic/symbols/icon';
import type { PullRequestChecksProps } from './pull-request-checks';
import {
  type PullRequestStatus,
  pullRequestAppearance,
  pullRequestStatusLabels,
} from './pull-request-indicator/pull-request-indicator';

// One of a Session's PRs, as its header shows it.
export interface SessionPullRequest {
  number: number;
  title: string;
  status: PullRequestStatus;
  // Absent when the PR has no CI checks.
  checks?: PullRequestChecksProps;
  mergeable: boolean;
}

function PullRequestIcon({
  status,
}: Pick<SessionPullRequest, 'status'>): React.JSX.Element {
  const appearance = pullRequestAppearance[status];
  return (
    <Icon
      name={appearance.icon}
      size="sm"
      className={cn('shrink-0', appearance.className)}
    />
  );
}

// "#45 Open": the PR's icon, number and state.
export function SessionPullRequestLabel({
  number,
  status,
}: Pick<SessionPullRequest, 'number' | 'status'>): React.JSX.Element {
  const label = pullRequestStatusLabels[status];
  return (
    <View
      accessible
      accessibilityLabel={`PR #${number}, ${label}`}
      className="flex-row items-center gap-1"
    >
      <PullRequestIcon status={status} />
      <Text role="secondary" className="font-medium text-foreground">
        #{number}
      </Text>
      <Text role="secondary" className="text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

export interface MorePullRequestsProps {
  pullRequests: SessionPullRequest[];
  shown: number;
  onShow: (number: number) => void;
}

// "+1 PR ⌄": the header shows one PR; this menu lists all of them and picks the one shown.
export function MorePullRequests({
  pullRequests,
  shown,
  onShow,
}: MorePullRequestsProps): React.JSX.Element {
  const more = pullRequests.length - 1;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <MenuButton label={`+${more} PR`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {pullRequests.map((pullRequest) => (
          <DropdownMenuItem
            key={pullRequest.number}
            accessibilityState={{ selected: pullRequest.number === shown }}
            onPress={() => onShow(pullRequest.number)}
          >
            <PullRequestIcon status={pullRequest.status} />
            <Text className="font-medium">#{pullRequest.number}</Text>
            <Text numberOfLines={1} className="min-w-0 shrink">
              {pullRequest.title}
            </Text>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
