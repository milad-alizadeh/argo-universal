import type { SessionInfo } from '@repo/contracts';
import type { SessionRowItem } from '@repo/contracts/plugins/wire';
import { sessionStatusLabels } from '../../session-status-dot';
import type { SessionsLayout } from '../../stores/sessions-view';
import type { ChangeStageProps } from '../change-stage/change-stage';

export interface SessionRowProps {
  session: SessionInfo;
  logo: string;
  selected?: boolean;
  pullRequest?: ChangeStageProps;
  // How long ago the Session was last active: it ends a quiet Session's title line, or a Compact row that has no PR.
  age?: string;
  // What the Plugins add to the row: meta-line items after Argo's own, the rest behind "+N".
  plugins?: SessionRowPlugins;
  // Opens a Plugin's page, when one of its items is pressed.
  onOpenPluginPage?: OpenPluginItemPage;
  // Regular: the title, metadata and Plan bar. Compact: one line.
  layout?: SessionsLayout;
  onSelect: (sessionId: string) => void;
  onRename?: (sessionId: string) => void;
  onArchive?: (sessionId: string) => void;
}

// One Plugin item on a Session row, with the Plugin it came from.
export interface SessionRowPluginItem {
  // Unique in its row: two Plugins, or one, may send the same text.
  key: string;
  pluginId: string;
  pluginName: string;
  item: SessionRowItem;
}

// A Session row's Plugin content under this Device's choices (ADR-0035): the items that fit, the rest behind "+N".
export interface SessionRowPlugins {
  items: readonly SessionRowPluginItem[];
  more: readonly SessionRowPluginItem[];
}

export type OpenPluginItemPage = (pluginId: string, path: string) => void;

// A working Session shows no time: its dot already says it is live, so "now" would only repeat it.
export const quietAge = ({
  session,
  age,
}: Pick<SessionRowProps, 'session' | 'age'>): string | undefined =>
  session.status === 'running' ? undefined : age;

/*
 * What a screen reader says for the row: its press target is named by this label and reads no text from its lanes, so
 * the Archived pill that the meta line draws is said here too.
 */
export const sessionRowLabel = (session: SessionInfo): string =>
  [
    session.title,
    sessionStatusLabels[session.status],
    session.archivedAt === null ? undefined : 'Archived',
  ]
    .filter(Boolean)
    .join(', ');
