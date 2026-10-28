import type { ChangesSummary } from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import { Menu, type MenuAction } from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { View } from 'react-native';
import {
  ChangeStageIcon,
  SecondaryChangeStageIcon,
  ChangeStageModifier,
} from './change-stage/change-stage';
import {
  changeDescription,
  type ChangeState,
  resolveChangeStage,
} from './change-stage/change-stage-model';
import type { PullRequestChecksProps } from './pull-request-checks';

// One of a Session's Changes, shown by its Workbench and Inspector.
export type SessionPullRequest = ChangeState & {
  number: number;
  title: string;
  checks?: PullRequestChecksProps;
  summary?: ChangesSummary;
  mergeable: boolean;
};

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

function numberPair(props: SessionPullRequest): SecondaryPairProps {
  return { strong: `#${props.number}`, muted: resolveChangeStage(props).label };
}

// "#45 Open": the Change's icon, number and state.
export function SessionPullRequestLabel(
  props: SessionPullRequest,
): React.JSX.Element {
  const label = changeDescription(props);

  return (
    <View
      {...labelRow}
      accessibilityLabel={`Change #${props.number}, ${label}`}
    >
      <SecondaryChangeStageIcon {...props} />
      <SecondaryPair {...numberPair(props)} />
      <ChangeStageModifier {...props} />
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
      <ChangeStageIcon {...pullRequest} />
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

// "+1 Change ⌄": the header shows one Change; this menu lists all of them and picks the one shown.
export function MorePullRequests(
  props: MorePullRequestsProps,
): React.JSX.Element {
  const label = `+${props.pullRequests.length - 1} Change`;

  return (
    <Menu
      accessibilityLabel={label}
      trigger={label}
      align="start"
      actions={pullRequestActions(props)}
    />
  );
}
