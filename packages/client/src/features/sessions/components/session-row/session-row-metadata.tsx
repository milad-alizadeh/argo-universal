import { Pill } from '@repo/kit/primitives/status/pill';
import type * as React from 'react';
import { View } from 'react-native';
import { ChangeStage } from '../change-stage/change-stage';
import { ShellsCount, SubagentsCount } from './session-row-meta-counts';
import type { SessionRowMetadataProps } from './session-row-metadata-props';

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

function hasMetadata({
  session,
  pullRequest,
}: SessionRowMetadataProps): boolean {
  return [
    session.subagents.running > 0,
    session.shells.running > 0,
    session.archivedAt !== null,
    pullRequest !== undefined,
  ].some(Boolean);
}

// The Change leads the active Background Task and Agent counts; Plugin items follow as row accessories.
export function sessionMetadata(
  props: SessionRowMetadataProps,
): React.ReactNode {
  if (!hasMetadata(props)) return null;

  return (
    <View className="min-w-0 flex-row items-center gap-2.5">
      <PullRequestLabel pullRequest={props.pullRequest} />
      <ShellsCount {...props} />
      <SubagentsCount {...props} />
      {archivedContent(props)}
    </View>
  );
}
