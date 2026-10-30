import type {
  AgentServer,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import type { SessionsView } from '../../stores/sessions-view';
import type {
  OpenPluginItemPage,
  SessionRowPlugins,
} from '../session-row/session-row-props';

// What the Plugins add to the list's rows (ADR-0035), and what the list tells them back.
export interface SessionsListPlugins {
  // What the Plugins add to each row, by Session id; a row not listed is Argo's own.
  rows: ReadonlyMap<string, SessionRowPlugins>;
  // Opens a Plugin's page from one of its row items.
  openPage?: OpenPluginItemPage;
  // Told which Sessions' rows are drawn, on screen or just past it, so the Plugins are asked about those alone.
  onRowsDrawn?: (sessionIds: readonly string[]) => void;
}

export interface SessionsListProps {
  projects: ProjectsListOutput;
  agents: AgentServer[];
  sessions: SessionInfo[];
  query: string;
  // How the list groups, filters and lays out its rows.
  view: SessionsView;
  selectedSessionId?: string;
  // What the Plugins add to the rows, and the page an item opens.
  plugins?: SessionsListPlugins;
  onSelect: (id: string) => void;
  onStartSession?: () => void;
  // Desktop and the web: renaming from a row's double-click or context menu.
  onRename?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEndReached: () => void;
  onRefresh?: () => Promise<void>;
  // Desktop and the web only: the List draws no selection mode on a phone.
  onArchiveMany?: (sessionIds: readonly string[]) => void;
  onNewSession?: (projectId: string) => void;
  onProjectSettings?: (projectName: string) => void;
}
