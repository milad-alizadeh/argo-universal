import type { SessionInfo } from '@repo/contracts';
import type { SessionRowItem } from '@repo/contracts/plugins/wire';
import { sessionStatusLabels } from '../../session-status-dot';
import type { SessionsLayout } from '../../stores/sessions-view';
import type { ChangeStageProps } from '../change-stage/change-stage';

export interface SessionRowProps {
  session: SessionInfo;
  logo: string;
  selected?: boolean;
  subagentsFailed?: boolean;
  pullRequest?: ChangeStageProps;
  // How long ago the Session was last active: it leads a Regular row's meta line, and ends a Compact row that has no PR.
  age?: string;
  // The Plugins' items on the meta line, after Argo's own.
  items?: readonly SessionRowItem[];
  // Regular: the activity, metadata and Plan bar. Compact: one line.
  layout?: SessionsLayout;
  onSelect: (sessionId: string) => void;
  onRename?: (sessionId: string) => void;
  onArchive?: (sessionId: string) => void;
}

export const sessionRowLabel = (session: SessionInfo): string =>
  `${session.title}, ${sessionStatusLabels[session.status]}`;
