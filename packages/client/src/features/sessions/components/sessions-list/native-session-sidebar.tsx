import type { SessionInfo } from '@repo/contracts';
import {
  NativeSidebarList,
  type SidebarAction,
  type SidebarRow,
  type SidebarSection,
} from '@repo/kit/native-sidebar';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { useState } from 'react';
import {
  sessionStatusDot,
  sessionStatusLabels,
} from '../../session-status-dot';
import { sessionProgress } from '../session-row/session-row-todos';
import type { SessionsListEntry } from '../sessions-list-entries';
import { sessionAge } from './session-age';
import { useListEntries } from './sessions-list-entries-state';
import type { SessionsListProps } from './sessions-list-props';

const unfolded = new Set<string>();

type SessionActions = Pick<SessionsListProps, 'onRename' | 'onArchive'>;

type NativeSessionSidebarProps = SessionsListProps & { loading: boolean };

export function nativeSessionRow(
  session: SessionInfo,
  depth?: number,
  compact = false,
): SidebarRow {
  const progress = compact ? undefined : sessionProgress(session);

  return {
    id: session.sessionId,
    title: session.title,
    icon: depth ? 'binoculars' : 'sessions',
    subtitle: compact ? undefined : sessionMetadata(session),
    depth,
    value: sessionAge(session, Date.now()),
    status: {
      tone: sessionStatusDot(session.status).tone,
      label: sessionStatusLabels[session.status],
    },
    emphasized: session.status === 'unread',
    progress: progress && {
      value: progress.value,
      label: progress.accessibilityLabel,
    },
  };
}

function sessionMetadata(session: SessionInfo): string | undefined {
  const parts = [
    session.shells.running ? `${session.shells.running} Background Tasks` : '',
    session.subagents.running ? `${session.subagents.running} Agents` : '',
    session.archivedAt === null ? '' : 'Archived',
  ];

  return parts.filter(Boolean).join(' · ') || undefined;
}

function sessionActions(id: string, actions: SessionActions): SidebarAction[] {
  const { onRename, onArchive } = actions;

  return [
    ...(onRename
      ? [
          {
            title: 'Rename…',
            icon: 'edit' as const,
            onPress: (): void => onRename(id),
          },
        ]
      : []),
    ...(onArchive
      ? [
          {
            title: 'Archive',
            icon: 'archived' as const,
            destructive: true,
            onPress: (): void => onArchive(id),
          },
        ]
      : []),
  ];
}

type SidebarGroup = SidebarSection & { rows: SidebarRow[] };

function projectGroup(
  entry: Extract<SessionsListEntry, { kind: 'project' }>,
  props: NativeSessionSidebarProps,
  expansion: {
    folded: ReadonlySet<string>;
    change: (id: string, open: boolean) => void;
  },
): SidebarGroup {
  const { id, name, projectId } = entry;

  return {
    id,
    title: name,
    expanded: !expansion.folded.has(id),
    onExpandedChange: (open) => expansion.change(id, open),
    actions: [
      {
        title: 'New Session',
        icon: 'new-session',
        onPress: (): void => props.onNewSession?.(projectId),
      },
      {
        title: 'Project settings',
        icon: 'settings',
        onPress: (): void => props.onProjectSettings?.(name),
      },
    ],
    rows: [],
  };
}

function sidebarGroups(
  entries: readonly SessionsListEntry[],
  props: NativeSessionSidebarProps,
  expansion: Parameters<typeof projectGroup>[2],
): SidebarGroup[] {
  const groups: SidebarGroup[] = [];

  for (const entry of entries) {
    if (entry.kind === 'project') {
      groups.push(projectGroup(entry, props, expansion));
      continue;
    }

    if (entry.kind !== 'session') continue;

    if (!groups.length) groups.push({ id: 'sessions', rows: [] });

    groups.at(-1)?.rows.push({
      ...nativeSessionRow(
        entry.session,
        entry.tree?.depth,
        props.view.layout === 'compact',
      ),
      selected: props.selectedSessionId === entry.id,
      onPress: () => props.onSelect(entry.id),
      actions: sessionActions(entry.id, props),
    });
  }

  return groups;
}

export function NativeSessionSidebar(
  props: NativeSessionSidebarProps,
): React.JSX.Element {
  const [folded, setFolded] = useState(unfolded);
  const entries = useListEntries(props, unfolded);

  const change = (id: string, open: boolean): void =>
    setFolded((previous) => {
      const next = new Set(previous);

      if (open) next.delete(id);
      else next.add(id);

      return next;
    });

  return (
    <NativeSidebarList
      sections={sidebarGroups(entries, props, { folded, change })}
      empty={
        <EmptyState
          title={props.loading ? 'Loading Sessions' : 'No Sessions'}
        />
      }
      onRefresh={props.onRefresh}
      onEndReached={props.onEndReached}
    />
  );
}
