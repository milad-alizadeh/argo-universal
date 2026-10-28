import type {
  AgentServer,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import type { ReactElement } from 'react';
import type { SessionsView } from '../../stores/sessions-view';
import type {
  OpenPluginPage,
  SessionRowPlugins,
} from '../session-row/session-row-props';

export interface SessionsListProps {
  projects: ProjectsListOutput;
  agents: AgentServer[];
  sessions: SessionInfo[];
  query: string;
  // How the list groups, filters and lays out its rows.
  view: SessionsView;
  selectedSessionId?: string;
  // What the Plugins add to each row, by Session id; a row not listed is Argo's own.
  rowPlugins?: ReadonlyMap<string, SessionRowPlugins>;
  // Opens a Plugin's page from one of its row items.
  onOpenPluginPage?: OpenPluginPage;
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
  // Shown instead of the rows while Sessions load or fail to load.
  placeholder?: ReactElement;
}
