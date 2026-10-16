import type { AgentServer, ProjectInfo } from '@repo/contracts';
import type { NewSessionData } from './use-new-session-data';

export interface LoadedNewSession {
  serverName: string;
  projects: ProjectInfo[];
  agents: AgentServer[];
}

export const hasFailedToLoad = ({
  serverInfo,
  projects,
  agents,
}: NewSessionData): boolean =>
  serverInfo.isError || projects.isError || agents.status === 'failed';

const loadedServer = ({
  serverInfo,
  projects,
}: NewSessionData): Omit<LoadedNewSession, 'agents'> | undefined =>
  serverInfo.data &&
  projects.data && {
    serverName: serverInfo.data.name,
    projects: projects.data,
  };

export const loadedNewSession = (
  data: NewSessionData,
): LoadedNewSession | undefined => {
  const server = loadedServer(data);

  if (!server || data.agents.status !== 'loaded') return undefined;

  return { ...server, agents: data.agents.agents };
};
