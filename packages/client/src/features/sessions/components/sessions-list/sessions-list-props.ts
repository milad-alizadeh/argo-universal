import type {
  AgentsListOutput,
  ProjectsListOutput,
  SessionInfo,
} from '@repo/contracts';
import type { ReactElement } from 'react';

export interface SessionsListProps {
  projects: ProjectsListOutput;
  agents: AgentsListOutput;
  sessions: SessionInfo[];
  query: string;
  archived: boolean;
  selectedSessionId?: string;
  onSelect: (id: string) => void;
  onEndReached: () => void;
  onNewSession?: (projectId: string) => void;
  onProjectSettings?: (projectName: string) => void;
  // Scrolls with the rows, above the first Project.
  header?: ReactElement;
  // Shown instead of the rows while Sessions load or fail to load.
  placeholder?: ReactElement;
}
