import type { SessionInfo } from '@repo/contracts';
import { sessionStatusLabels } from '../../session-status-dot';
import type { SessionsLayout } from '../../stores/sessions-view';
import type { PullRequestIndicatorProps } from '../pull-request-indicator/pull-request-indicator';

export interface SessionRowProps {
  session: SessionInfo;
  logo: string;
  selected?: boolean;
  subagentsFailed?: boolean;
  pullRequest?: PullRequestIndicatorProps;
  // Short text at the end of the title line, such as how long ago the Session was active; a Compact row shows it when the Session has no PR.
  trailing?: string;
  // Regular: the activity, metadata and Plan bar. Compact: one line.
  layout?: SessionsLayout;
  onSelect: (sessionId: string) => void;
  onRename?: (sessionId: string) => void;
  onArchive?: (sessionId: string) => void;
}

export const sessionRowLabel = (session: SessionInfo): string => `${session.title}, ${sessionStatusLabels[session.status]}`;
export const showsSessionAge = (layout: SessionsLayout | undefined, flat = false): boolean => flat || layout === 'compact';
