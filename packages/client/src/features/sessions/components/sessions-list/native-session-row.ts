import type { SessionInfo } from '@repo/contracts';
import type { SidebarRow } from '@repo/kit/native-sidebar';
import {
  sessionStatusDot,
  sessionStatusLabels,
} from '../../session-status-dot';
import { sessionProgress } from '../session-row/session-row-todos';
import { sessionAge } from './session-age';

// A row's status as a Session row draws it: its dot's tone and label, bold while Unread.
export const nativeRowStatus = (
  status: SessionInfo['status'],
): Pick<SidebarRow, 'status' | 'emphasized'> => ({
  status: {
    tone: sessionStatusDot(status).tone,
    label: sessionStatusLabels[status],
  },
  emphasized: status === 'unread',
});

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
    ...nativeRowStatus(session.status),
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
