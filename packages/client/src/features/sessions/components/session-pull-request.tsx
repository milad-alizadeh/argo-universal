import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { MenuButton } from '#primitives/buttons/menu-button/menu-button';
import { Text } from '#primitives/display/text/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#primitives/overlays/dropdown-menu/dropdown-menu';
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
      role="secondary"
      className={cn('shrink-0', appearance.className)}
    />
  );
}

interface SecondaryPairProps {
  strong: string;
  muted: string;
}

function SecondaryPair(props: SecondaryPairProps): React.JSX.Element {
  return (
    <>
      <Text role="secondary" className="font-medium text-foreground">
        {props.strong}
      </Text>
      <Text role="secondary" className="text-muted-foreground">
        {props.muted}
      </Text>
    </>
  );
}

const labelRow = {
  accessible: true,
  className: 'flex-row items-center gap-1',
} as const;

// "#45 Open": the PR's icon, number and state.
export function SessionPullRequestLabel({
  number,
  status,
}: Pick<SessionPullRequest, 'number' | 'status'>): React.JSX.Element {
  const label = pullRequestStatusLabels[status];

  return (
    <View {...labelRow} accessibilityLabel={`PR #${number}, ${label}`}>
      <PullRequestIcon status={status} />
      <SecondaryPair strong={`#${number}`} muted={label} />
    </View>
  );
}

export interface MorePullRequestsProps {
  pullRequests: SessionPullRequest[];
  shown: number;
  onShow: (number: number) => void;
}

function PullRequestItemContent(
  pullRequest: SessionPullRequest,
): React.JSX.Element {
  return (
    <>
      <PullRequestIcon status={pullRequest.status} />
      <Text className="font-medium">#{pullRequest.number}</Text>
      <Text numberOfLines={1} className="min-w-0 shrink">
        {pullRequest.title}
      </Text>
    </>
  );
}

function pullRequestItem(
  pullRequest: SessionPullRequest,
  { shown, onShow }: MorePullRequestsProps,
): React.JSX.Element {
  return (
    <DropdownMenuItem
      key={pullRequest.number}
      accessibilityState={{ selected: pullRequest.number === shown }}
      onPress={() => onShow(pullRequest.number)}
    >
      <PullRequestItemContent {...pullRequest} />
    </DropdownMenuItem>
  );
}

function pullRequestItems(props: MorePullRequestsProps): React.JSX.Element[] {
  return props.pullRequests.map((pullRequest) =>
    pullRequestItem(pullRequest, props),
  );
}

// "+1 PR ⌄": the header shows one PR; this menu lists all of them and picks the one shown.
export function MorePullRequests(
  props: MorePullRequestsProps,
): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <MenuButton label={`+${props.pullRequests.length - 1} PR`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {pullRequestItems(props)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
