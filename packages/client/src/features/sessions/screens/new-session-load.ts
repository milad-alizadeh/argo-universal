import type { AgentInfo, ProjectInfo, SystemInfo } from '@repo/contracts';
import { offeredAgents } from '../state/session-choices';

interface Query<Data> {
  data?: Data;
  isError: boolean;
}

// The Server reads New Session draws from.
export interface NewSessionQueries {
  serverInfo: Query<SystemInfo>;
  projects: Query<ProjectInfo[]>;
  agents: Query<AgentInfo[]>;
}

export interface LoadedNewSession {
  serverName: string;
  projects: ProjectInfo[];
  agents: AgentInfo[];
  // True until the saved Agents arrive; the picker fills then.
  agentsLoading: boolean;
}

export const hasFailedToLoad = ({
  serverInfo,
  projects,
  agents,
}: NewSessionQueries): boolean =>
  serverInfo.isError || projects.isError || agents.isError;

const loadedServer = ({
  serverInfo,
  projects,
}: NewSessionQueries):
  | Pick<LoadedNewSession, 'serverName' | 'projects'>
  | undefined =>
  serverInfo.data &&
  projects.data && {
    serverName: serverInfo.data.name,
    projects: projects.data,
  };

// Ready once the Server and its Projects load; the picker fills from the saved Agents when they arrive.
export const loadedNewSession = (
  queries: NewSessionQueries,
): LoadedNewSession | undefined => {
  const server = loadedServer(queries);
  const agents = queries.agents.data;
  return (
    server && {
      ...server,
      agents: offeredAgents(agents ?? []),
      agentsLoading: agents === undefined,
    }
  );
};
