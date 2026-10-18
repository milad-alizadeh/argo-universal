import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Label } from '#primitives/content/label';
import { Pill } from '#primitives/status/pill';
import { StatusDot } from '#primitives/status/status-dot';
import {
  pullRequestAppearance,
  type PullRequestIndicatorProps,
} from '../pull-request-indicator/pull-request-indicator';

export interface SessionRowMetadataProps {
  session: SessionInfo;
  selected: boolean;
  subagentsFailed?: boolean;
  pullRequest?: PullRequestIndicatorProps;
}

export function markSurface(selected: boolean): string {
  return cn(
    'border-card bg-card',
    selected && 'web:wide:border-content web:wide:bg-content',
  );
}

function subagentStatus(
  props: SessionRowMetadataProps,
): 'failed' | 'running' | undefined {
  if (props.subagentsFailed) {
    return 'failed';
  }

  return props.session.subagents.running > 0 ? 'running' : undefined;
}

function SubagentsStatus(props: SessionRowMetadataProps): React.ReactNode {
  const status = subagentStatus(props);

  if (status === undefined) {
    return null;
  }

  return <SubagentDot status={status} selected={props.selected} />;
}

function SubagentDot({
  status,
  selected,
}: {
  status: 'failed' | 'running';
  selected: boolean;
}): React.ReactNode {
  return (
    <View className={subagentDotClassName(selected)}>
      <SubagentMark status={status} />
    </View>
  );
}

function subagentDotClassName(selected: boolean): string {
  return cn(
    'absolute -right-0.75 -top-0.75 rounded-full border-2 border-card bg-card p-0.5',
    markSurface(selected),
  );
}

function SubagentMark({
  status,
}: {
  status: 'failed' | 'running';
}): React.ReactNode {
  return (
    <StatusDot
      tone={status === 'failed' ? 'danger' : 'success'}
      pulse={status === 'running'}
      size="sm"
    />
  );
}

function SubagentsCount(props: SessionRowMetadataProps): React.ReactNode {
  const { total, running } = props.session.subagents;

  if (total <= 0) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`Subagents: ${total}, ${running} running`}
      className="relative shrink-0"
    >
      <Label icon="agent" text={String(total)} />
      <SubagentsStatus {...props} />
    </View>
  );
}

function PullRequestLabel({
  pullRequest,
}: Pick<SessionRowMetadataProps, 'pullRequest'>): React.ReactNode {
  if (!pullRequest) {
    return null;
  }

  return (
    <PullRequestText number={pullRequest.number} status={pullRequest.status} />
  );
}

function PullRequestText({
  number,
  status,
}: {
  number: number;
  status: PullRequestIndicatorProps['status'];
}): React.ReactNode {
  return <Label {...pullRequestLabelProps(number, status)} />;
}

function pullRequestLabelProps(
  number: number,
  status: PullRequestIndicatorProps['status'],
): React.ComponentProps<typeof Label> {
  return {
    testID: 'session-pull-request-slot',
    icon: pullRequestAppearance[status].icon,
    text: `#${number}`,
    tone: pullRequestAppearance[status].tone,
    accessibilityLabel: `${status} PR #${number}`,
  };
}

function archivedContent({
  session,
}: SessionRowMetadataProps): React.ReactNode {
  return session.archivedAt === null ? null : (
    <Pill text="Archived" tone="muted" />
  );
}

function hasMetadata({
  session,
  pullRequest,
}: SessionRowMetadataProps): boolean {
  return [
    session.subagents.total > 0,
    session.archivedAt !== null,
    pullRequest !== undefined,
  ].some(Boolean);
}

export function sessionMetadata(
  props: SessionRowMetadataProps,
): React.ReactNode {
  if (!hasMetadata(props)) {
    return null;
  }

  return (
    <View className="min-w-0 flex-row items-center gap-3">
      <SubagentsCount {...props} />
      {archivedContent(props)}
      <PullRequestLabel pullRequest={props.pullRequest} />
    </View>
  );
}
