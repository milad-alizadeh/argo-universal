import type {
  AgentsListOutput,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import type { ReactElement } from 'react';
import type { SessionsLayout } from '../../state/sessions-layout';

export interface SessionsListProps {
  projects: ProjectsListOutput;
  agents: AgentsListOutput;
  sessions: SessionInfo[];
  query: string;
  // Results as one list with no Project headings, each row showing how long ago it was active.
  flat?: boolean;
  archived: boolean;
  // Regular rows, or Compact one-line rows; Regular when unset.
  layout?: SessionsLayout;
  selectedSessionId?: string;
  onSelect: (id: string) => void;
  // Desktop and the web: renaming from a row's double-click or context menu.
  onRename?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEndReached: () => void;
  onNewSession?: (projectId: string) => void;
  onProjectSettings?: (projectName: string) => void;
  // Shown instead of the rows while Sessions load or fail to load.
  placeholder?: ReactElement;
}
