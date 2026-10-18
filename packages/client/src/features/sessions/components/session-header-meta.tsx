import type * as React from 'react';
import { View } from 'react-native';
import { formatElapsed } from '#lib/generic/format-elapsed';
import { useClock } from '#lib/generic/use-clock';
import { cn } from '#lib/generic/utils';
import {
  StatusIndicator,
  statusLabels,
} from '#lib/product/status-indicator/status-indicator';
import { Text } from '#primitives/display/text';
import { SizeClass } from '../../../lib/generic/size-class/size-class';
import { PullRequestChecks } from './pull-request-checks';
import type {
  SessionHeaderProps,
  SessionHeaderStatus,
} from './session-header-props';
import {
  MorePullRequests,
  type SessionPullRequest,
  SessionPullRequestLabel,
} from './session-pull-request';

const statusTextColor = {
  running: 'text-success',
  needs_input: 'text-warning',
  idle: 'text-muted-foreground',
} satisfies Record<SessionHeaderStatus, string>;

type ElapsedTimeProps = Pick<SessionHeaderProps, 'startedAt' | 'now'>;

const tabletHidden = 'hidden text-muted-foreground wide-type:flex';

function ElapsedTime(props: ElapsedTimeProps): React.JSX.Element | null {
  const { startedAt, now } = props;
  const clock = useClock(startedAt !== null, now);

  if (startedAt === null) return null;

  // A tablet's larger type leaves the medium window's meta line no room for it (#927).
  return (
    <Text role="secondary" className={tabletHidden}>
      {formatElapsed(clock - startedAt)}
    </Text>
  );
}

type StatusLineProps = Pick<SessionHeaderProps, 'status' | 'startedAt' | 'now'>;

const statusDot = {
  size: 'small',
  className: 'size-1.5 border-0',
  testID: 'session-status',
} as const;

function StatusLine({
  status,
  ...elapsed
}: StatusLineProps): React.JSX.Element {
  return (
    <>
      <Text role="secondary" className={cn(statusTextColor[status])}>
        {statusLabels[status]}
      </Text>
      <StatusIndicator status={status} {...statusDot} />
      <ElapsedTime {...elapsed} />
    </>
  );
}

// The gap between the status, the PR and its checks on the meta line.
function MetaGap(): React.JSX.Element {
  return <View className="w-2.5 shrink-0" />;
}

// A medium window's meta line is the status and the PR only (#927).
function ShownChecks({
  checks,
}: Pick<SessionPullRequest, 'checks'>): React.JSX.Element | null {
  if (!checks) return null;

  return (
    <SizeClass compact={null} medium={null} wide={<Checks {...checks} />} />
  );
}

function Checks(
  checks: NonNullable<SessionPullRequest['checks']>,
): React.JSX.Element {
  return (
    <>
      <MetaGap />
      <PullRequestChecks {...checks} />
    </>
  );
}

interface ShownPullRequestProps {
  pullRequests: SessionPullRequest[];
  shown: SessionPullRequest | undefined;
  onShow: (number: number) => void;
}

function OtherPullRequests(
  props: ShownPullRequestProps & { shown: SessionPullRequest },
): React.JSX.Element | null {
  if (props.pullRequests.length <= 1) return null;

  return (
    <MorePullRequests
      pullRequests={props.pullRequests}
      shown={props.shown.number}
      onShow={props.onShow}
    />
  );
}

function PullRequestMeta(
  props: ShownPullRequestProps,
): React.JSX.Element | null {
  const { shown } = props;

  if (!shown) return null;

  return (
    <>
      <MetaGap />
      <SessionPullRequestLabel {...shown} />
      <OtherPullRequests {...props} shown={shown} />
      <ShownChecks checks={shown.checks} />
    </>
  );
}

function TitleLine({ title }: { title: string }): React.JSX.Element {
  return (
    // A long title stops at two thirds of the row, well clear of the actions.
    <View className="max-w-2/3">
      <Text
        accessibilityRole="heading"
        aria-level={2}
        numberOfLines={1}
        role={'heading'}
      >
        {title}
      </Text>
    </View>
  );
}

type MetaLineProps = StatusLineProps & ShownPullRequestProps;

function MetaLine({
  status,
  startedAt,
  now,
  ...pullRequest
}: MetaLineProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5">
      <StatusLine status={status} startedAt={startedAt} now={now} />
      <PullRequestMeta {...pullRequest} />
    </View>
  );
}

// The one-line title above the meta line: status, one PR and its checks.
export function SessionHeaderTitle({
  title,
  ...meta
}: MetaLineProps & { title: string }): React.JSX.Element {
  return (
    <View className="min-w-0 gap-0.5">
      <TitleLine title={title} />
      <MetaLine {...meta} />
    </View>
  );
}
