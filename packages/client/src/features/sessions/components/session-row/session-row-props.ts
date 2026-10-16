import type { SessionInfo } from '@repo/contracts';
import { statusLabels } from '#lib/product/status-indicator/status-indicator';
import type { VirtualListPosition } from '#primitives/lists/virtual-list-item';
import type { SessionsLayout } from '../../stores/sessions-layout';
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
  // A Compact row's place among its Project's Sessions, which a phone draws as one grouped list section.
  position?: VirtualListPosition;
  onSelect: (sessionId: string) => void;
  // Desktop and the web: a double-click, or Rename in the row's context menu, starts renaming the Session.
  onRename?: (sessionId: string) => void;
  // Archive in the row's context menu.
  onArchive?: (sessionId: string) => void;
}

export const sessionRowLabel = (session: SessionInfo): string =>
  `${session.title}, ${statusLabels[session.status]}`;

// Compact rows, and Regular rows in flat search results, show how long ago each Session was active.
export const showsSessionAge = (
  layout: SessionsLayout | undefined,
  flat = false,
): boolean => flat || layout === 'compact';
