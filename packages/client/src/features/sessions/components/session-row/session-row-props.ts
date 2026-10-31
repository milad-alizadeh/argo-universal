import type { SessionInfo } from '@repo/contracts';
import type { SessionRowItem } from '@repo/contracts/plugins/wire';
import type { SystemSymbolSource } from '@repo/kit/symbols/symbol-source';
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
  // What the Plugins add to the row: meta-line items after Argo's own, the rest behind "+N", and the chosen Activity line.
  plugins?: SessionRowPlugins;
  // Opens a Plugin's page, when one of its items is pressed.
  onOpenPluginPage?: OpenPluginItemPage;
  // Regular: the activity, metadata and Plan bar. Compact: one line.
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

/*
 * A Session row's Plugin content under this Device's choices (ADR-0035): the items that fit, the rest behind "+N",
 * and the chosen Plugin's Activity line in place of Argo's, when it has one for this Session.
 */
export interface SessionRowPlugins {
  items: readonly SessionRowPluginItem[];
  more: readonly SessionRowPluginItem[];
  activity?: SessionRowActivity;
}

// The chosen Plugin's Activity line, led by that Plugin's glyph.
export interface SessionRowActivity {
  text: string;
  icon: SystemSymbolSource;
}

export type OpenPluginItemPage = (pluginId: string, path: string) => void;

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
