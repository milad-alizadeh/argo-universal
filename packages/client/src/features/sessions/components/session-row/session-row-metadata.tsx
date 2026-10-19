import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Label } from '#primitives/content/label';
import { Text } from '#primitives/content/text';
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
  age?: string;
}

function markSurface(selected: boolean): string {
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
    <View testID="subagents-status" className={subagentDotClassName(selected)}>
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
  return pullRequest ? <Label {...pullRequestLabelProps(pullRequest)} /> : null;
}

function pullRequestLabelProps({
  number,
  status,
}: PullRequestIndicatorProps): React.ComponentProps<typeof Label> {
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

// How long ago the Session was active leads the line.
function ageContent({ age }: SessionRowMetadataProps): React.ReactNode {
  return age === undefined ? null : (
    <Text role="secondary" tone="muted">
      {age}
    </Text>
  );
}

function hasMetadata({
  session,
  pullRequest,
  age,
}: SessionRowMetadataProps): boolean {
  return [
    age !== undefined,
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
    <View className="min-w-0 flex-row items-center gap-2.5">
      {ageContent(props)}
      <PullRequestLabel pullRequest={props.pullRequest} />
      <SubagentsCount {...props} />
      {archivedContent(props)}
    </View>
  );
}
