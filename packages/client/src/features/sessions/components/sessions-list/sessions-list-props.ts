import type {
  AgentServer,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import type { ReactElement } from 'react';
import type { SessionsView } from '../../stores/sessions-view';

export interface SessionsListProps {
  projects: ProjectsListOutput;
  agents: AgentServer[];
  sessions: SessionInfo[];
  query: string;
  // How the list orders, groups, filters and lays out its rows.
  view: SessionsView;
  selectedSessionId?: string;
  onSelect: (id: string) => void;
  onStartSession?: () => void;
  // Desktop and the web: renaming from a row's double-click or context menu.
  onRename?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEndReached: () => void;
  onNewSession?: (projectId: string) => void;
  onProjectSettings?: (projectName: string) => void;
  // Shown instead of the rows while Sessions load or fail to load.
  placeholder?: ReactElement;
}
