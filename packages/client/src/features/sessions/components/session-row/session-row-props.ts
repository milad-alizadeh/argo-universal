import type { SessionInfo } from '@repo/contracts';
import { statusLabels } from '#lib/product/status-indicator/status-indicator';
import type { VirtualListPosition } from '#primitives/lists/virtual-list-item';
import type { SessionsLayout } from '../../state/sessions-layout';
import type { IssueIndicatorProps } from '../issue-indicator/issue-indicator';
import type { PullRequestIndicatorProps } from '../pull-request-indicator/pull-request-indicator';

export interface SessionRowProps {
  session: SessionInfo;
  logo: string;
  selected?: boolean;
  subagentsFailed?: boolean;
  issue?: IssueIndicatorProps;
  pullRequest?: PullRequestIndicatorProps;
  // Short text at the end of the title line, such as how long ago the Session was active; a Compact row shows it when it has no Plan under way.
  trailing?: string;
  // Regular: the activity, metadata and Plan bar. Compact: one line.
  layout?: SessionsLayout;
  // A Compact row's place among its Project's Sessions, which a phone draws as one grouped list section.
  position?: VirtualListPosition;
  onSelect: (sessionId: string) => void;
}

export const sessionRowLabel = (session: SessionInfo): string =>
  `${session.title}, ${statusLabels[session.status]}`;
