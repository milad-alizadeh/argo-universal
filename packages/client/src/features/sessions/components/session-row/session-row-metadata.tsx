import type { SessionRowItem } from '@repo/contracts/plugins/wire';
import { Text } from '@repo/kit/primitives/content/text';
import { Pill } from '@repo/kit/primitives/status/pill';
import type * as React from 'react';
import { View } from 'react-native';
import { ChangeStage } from '../change-stage/change-stage';
import { ShellsCount, SubagentsCount } from './session-row-meta-counts';
import type { SessionRowMetadataProps } from './session-row-metadata-props';
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

// Each Plugin item as Argo draws it: its text in its tone. Two Plugins may send the same text, so each repeat is counted into its key.
const pluginItems = ({
  items = [],
}: SessionRowMetadataProps): React.ReactNode =>
  withKeys(items).map(({ key, item }) => (
    <Text key={key} role="secondary" tone={item.tone ?? 'muted'}>
      {item.text}
    </Text>
  ));

function withKeys(
  items: readonly SessionRowItem[],
): { key: string; item: SessionRowItem }[] {
  const seen = new Map<string, number>();

  return items.map((item) => {
    const repeat = seen.get(item.text) ?? 0;

    seen.set(item.text, repeat + 1);

    return { key: `${item.text}:${repeat}`, item };
  });
}

function hasMetadata({
  session,
  pullRequest,
  age,
  items = [],
}: SessionRowMetadataProps): boolean {
  return [
    age !== undefined,
    items.length > 0,
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
      {pluginItems(props)}
    </View>
  );
}
