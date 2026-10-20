import type * as React from 'react';
import { View } from 'react-native';
import {
  pullRequestAppearance,
  type PullRequestIndicatorProps,
} from '#features/sessions';
import { Label } from '#primitives/content/label';
import { Text } from '#primitives/content/text';
import { Pill } from '#primitives/status/pill';
import { ShellsCount, SubagentsCount } from './session-row-meta-counts';
import type { SessionRowMetadataProps } from './session-row-metadata-props';
import { sidebarRows } from './session-row-sidebar';

export type { SessionRowMetadataProps } from './session-row-metadata-props';

function PullRequestLabel({
  pullRequest,
}: Pick<SessionRowMetadataProps, 'pullRequest'>): React.ReactNode {
  return pullRequest ? <Label {...pullRequestLabelProps(pullRequest)} /> : null;
}

// A sidebar row's PR number is medium in its state's colour (Paper "SessionsList").
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
    sidebar: sidebarRows,
    emphasized: sidebarRows,
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
    sidebarRows && session.shells.total > 0,
    session.archivedAt !== null,
    pullRequest !== undefined,
  ].some(Boolean);
}

// The time, the PR, then on a sidebar row its Shells, then its Subagents (Paper "SessionsList").
export function sessionMetadata(
  props: SessionRowMetadataProps,
): React.ReactNode {
  if (!hasMetadata(props)) return null;

  return (
    <View className="min-w-0 flex-row items-center gap-2.5">
      {ageContent(props)}
      <PullRequestLabel pullRequest={props.pullRequest} />
      <ShellsCount {...props} />
      <SubagentsCount {...props} />
      {archivedContent(props)}
    </View>
  );
}
