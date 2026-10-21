import { Label } from '@repo/kit/primitives/content/label';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import type { SessionRowMetadataProps } from './session-row-metadata-props';
import { sidebarRows } from './session-row-sidebar';

type BadgeStatus = 'failed' | 'running';

const runningStatus = (
  props: SessionRowMetadataProps,
): BadgeStatus | undefined =>
  props.session.subagents.running > 0 ? 'running' : undefined;

function subagentStatus(
  props: SessionRowMetadataProps,
): BadgeStatus | undefined {
  if (sidebarRows) return undefined;

  return props.subagentsFailed ? 'failed' : runningStatus(props);
}

function dotClassName(selected: boolean): string {
  return cn(
    'absolute -right-0.75 -top-0.75 rounded-full border-2 border-card bg-card p-0.5',
    selected && 'web:wide:border-content web:wide:bg-content',
  );
}

// A phone's count carries a dot while a Subagent runs or after one failed.
function SubagentsStatus(props: SessionRowMetadataProps): React.ReactNode {
  const status = subagentStatus(props);

  if (status === undefined) return null;

  return (
    <View testID="subagents-status" className={dotClassName(props.selected)}>
      <StatusDot
        tone={status === 'failed' ? 'danger' : 'success'}
        pulse={status === 'running'}
        size="sm"
      />
    </View>
  );
}

// A sidebar row's count stands alone (Paper "SessionsList"); the row's own dot speaks for the Session.
export function SubagentsCount(
  props: SessionRowMetadataProps,
): React.ReactNode {
  const { total, running } = props.session.subagents;

  if (total <= 0) return null;

  return (
    <View
      accessibilityLabel={`Subagents: ${total}, ${running} running`}
      className="relative shrink-0"
    >
      <Label icon="agent" text={String(total)} sidebar={sidebarRows} />
      <SubagentsStatus {...props} />
    </View>
  );
}

// How many shells the Session has open; a sidebar row's meta only.
export function ShellsCount({
  session,
}: SessionRowMetadataProps): React.ReactNode {
  const { total, running } = session.shells;

  if (!sidebarRows || total <= 0) return null;

  return (
    <View accessibilityLabel={`Shells: ${total}, ${running} running`}>
      <Label icon="terminal" text={String(total)} sidebar />
    </View>
  );
}
