import { Text } from '@repo/kit/primitives/content/text';
import { Pill } from '@repo/kit/primitives/status/pill';
import type * as React from 'react';
import { View } from 'react-native';
import { ChangeStage } from '../change-stage/change-stage';
import { ShellsCount, SubagentsCount } from './session-row-meta-counts';
import type { SessionRowMetadataProps } from './session-row-metadata-props';
import {
  hasPluginItems,
  SessionRowPluginItems,
} from './session-row-plugin-items';
import { sidebarRows } from './session-row-sidebar';

export type { SessionRowMetadataProps } from './session-row-metadata-props';

function PullRequestLabel({
  pullRequest,
}: Pick<SessionRowMetadataProps, 'pullRequest'>): React.ReactNode {
  return pullRequest ? (
    <ChangeStage {...pullRequest} testID="session-pull-request-slot" />
  ) : null;
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
  plugins,
}: SessionRowMetadataProps): boolean {
  return [
    age !== undefined,
    hasPluginItems(plugins),
    session.subagents.total > 0,
    sidebarRows && session.shells.total > 0,
    session.archivedAt !== null,
    pullRequest !== undefined,
  ].some(Boolean);
}

// The time, the Change, then on a sidebar row its Shells, then its Subagents (Paper "SessionsList"), then the Plugins' items.
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
      <SessionRowPluginItems {...props} />
    </View>
  );
}
