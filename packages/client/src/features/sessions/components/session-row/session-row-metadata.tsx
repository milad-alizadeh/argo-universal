import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { StatusIndicator } from '#lib/product/status-indicator/status-indicator';
import { Badge } from '#primitives/display/badge/badge';
import { Icon } from '#primitives/display/icon/icon';
import { Text } from '#primitives/display/text/text';
import {
  IssueIndicator,
  type IssueIndicatorProps,
} from '../issue-indicator/issue-indicator';
import {
  PullRequestIndicator,
  type PullRequestIndicatorProps,
} from '../pull-request-indicator/pull-request-indicator';
import { PlanProgress } from './session-row-plan';

export interface SessionRowMetadataProps {
  session: SessionInfo;
  selected: boolean;
  subagentsFailed?: boolean;
  issue?: IssueIndicatorProps;
  pullRequest?: PullRequestIndicatorProps;
}

export function markSurface(selected: boolean): string {
  return selected
    ? 'border-sidebar-accent bg-sidebar-accent'
    : 'border-sidebar bg-sidebar';
}

function subagentsStatus({
  session,
  subagentsFailed,
}: SessionRowMetadataProps): 'failed' | 'running' | undefined {
  if (subagentsFailed) return 'failed';

  return session.subagents.running > 0 ? 'running' : undefined;
}

function SubagentsStatus(props: SessionRowMetadataProps): React.ReactNode {
  const status = subagentsStatus(props);

  if (status === undefined) return null;

  return (
    <StatusIndicator
      testID="subagents-status"
      status={status}
      size="small"
      className={cn(
        'absolute -right-0.75 -top-0.75',
        markSurface(props.selected),
      )}
    />
  );
}

function SubagentsCount(props: SessionRowMetadataProps): React.JSX.Element {
  const { subagents } = props.session;

  return (
    <View
      accessibilityLabel={`Subagents: ${subagents.total}, ${subagents.running} running`}
      className="shrink-0 flex-row items-center gap-1"
    >
      <View className="relative">
        <Icon role="secondary" name="agent" className="text-muted-foreground" />
        <SubagentsStatus {...props} />
      </View>
      <Text role="secondary">{subagents.total}</Text>
    </View>
  );
}

function ArchivedBadge(): React.JSX.Element {
  return (
    <Badge variant="secondary" className="py-0">
      <Text role="badge" className="text-muted-foreground">
        Archived
      </Text>
    </Badge>
  );
}

function IndicatorSlot({
  testID,
  children,
}: {
  testID: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View testID={testID} className="h-4 shrink-0 flex-row items-center">
      {children}
    </View>
  );
}

function planContent({
  session: { plan },
}: SessionRowMetadataProps): React.JSX.Element | undefined {
  if (!plan || plan.total <= 0) return undefined;

  return <PlanProgress key="plan" plan={plan} />;
}

function subagentsContent(
  props: SessionRowMetadataProps,
): React.JSX.Element | undefined {
  if (props.session.subagents.total <= 0) return undefined;

  return <SubagentsCount key="subagents" {...props} />;
}

function archivedContent({
  session,
}: SessionRowMetadataProps): React.JSX.Element | undefined {
  if (session.archivedAt === null) return undefined;

  return <ArchivedBadge key="archived" />;
}

function issueContent({
  issue,
}: SessionRowMetadataProps): React.JSX.Element | undefined {
  if (!issue) return undefined;

  return (
    <IndicatorSlot key="issue" testID="session-issue-slot">
      <IssueIndicator {...issue} />
    </IndicatorSlot>
  );
}

function pullRequestContent({
  pullRequest,
}: SessionRowMetadataProps): React.JSX.Element | undefined {
  if (!pullRequest) return undefined;

  return (
    <IndicatorSlot key="pull-request" testID="session-pull-request-slot">
      <PullRequestIndicator {...pullRequest} />
    </IndicatorSlot>
  );
}

const metadataContents = [
  planContent,
  subagentsContent,
  archivedContent,
  issueContent,
  pullRequestContent,
];

export function SessionRowMetadata(
  props: SessionRowMetadataProps,
): React.ReactNode {
  const items = metadataContents.flatMap((content) => {
    const item = content(props);

    return item === undefined ? [] : [item];
  });

  if (items.length === 0) return null;

  return (
    <View className="min-h-5 flex-row flex-wrap items-center gap-x-3 gap-y-1 pt-1">
      {items}
    </View>
  );
}
