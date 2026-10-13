import type { AgentInfo, ProjectInfo } from '@repo/contracts';
import { offeredAgents } from '../state/session-choices';
import type { NewSessionData } from './use-new-session-data';

export interface LoadedNewSession {
  serverName: string;
  projects: ProjectInfo[];
  agents: AgentInfo[];
}

export const hasFailedToLoad = ({
  serverInfo,
  projects,
  agents,
}: NewSessionData): boolean =>
  serverInfo.isError || projects.isError || agents.isError;

const loadedServer = ({
  serverInfo,
  projects,
}: NewSessionData): Omit<LoadedNewSession, 'agents'> | undefined =>
  serverInfo.data &&
  projects.data && {
    serverName: serverInfo.data.name,
    projects: projects.data,
  };

// Ready once the Server and its Projects load; the picker fills from the saved Agents when they arrive.
export const loadedNewSession = (
  data: NewSessionData,
): LoadedNewSession | undefined => {
  const server = loadedServer(data);
  return server && { ...server, agents: offeredAgents(data.agents.data ?? []) };
};
