import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Menu, type MenuAction } from '#primitives/overlays/menu';
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
      role="control"
      tone={appearance.tone}
      className="shrink-0"
    />
  );
}

interface SecondaryPairProps {
  strong: string;
  muted: string;
}

// A tablet's larger type leaves the medium window's meta line room for the number only (#927).
function SecondaryPair(props: SecondaryPairProps): React.JSX.Element {
  return (
    <>
      <Text role="secondary" className="font-medium text-foreground">
        {props.strong}
      </Text>
      <Text
        role="secondary"
        className="hidden text-muted-foreground wide-type:flex"
      >
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

function pullRequestAction(
  pullRequest: SessionPullRequest,
  { shown, onShow }: MorePullRequestsProps,
): MenuAction {
  return {
    label: `#${pullRequest.number} ${pullRequest.title}`,
    selected: pullRequest.number === shown,
    onPress: () => onShow(pullRequest.number),
    content: <PullRequestItemContent {...pullRequest} />,
  };
}

function pullRequestActions(props: MorePullRequestsProps): MenuAction[] {
  return props.pullRequests.map((pullRequest) =>
    pullRequestAction(pullRequest, props),
  );
}

// "+1 PR ⌄": the header shows one PR; this menu lists all of them and picks the one shown.
export function MorePullRequests(
  props: MorePullRequestsProps,
): React.JSX.Element {
  const label = `+${props.pullRequests.length - 1} PR`;

  return (
    <Menu
      accessibilityLabel={label}
      trigger={label}
      align="start"
      actions={pullRequestActions(props)}
    />
  );
}
