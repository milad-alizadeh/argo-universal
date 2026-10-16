import type { AgentLaunch } from '..';
import type { ConnectionAuthentication } from '../auth/authenticate';
import type { AcpConnection } from './connection';

export type Entry = {
  agentId: string;
  projectId: string;
  version: string;
  directory?: string;
  connecting: Promise<AcpConnection>;
  connection: AcpConnection;
  pending: number;
  dropped: boolean;
};

export const createEntry = (
  launch: AgentLaunch,
  connection: AcpConnection,
  connecting: Promise<AcpConnection>,
): Entry => ({
  agentId: launch.agentId,
  projectId: launch.projectId,
  version: launch.version,
  directory: launch.installationDirectory,
  connecting,
  connection,
  pending: 0,
  dropped: false,
});

export const entryInUse = (entry: Entry): boolean =>
  entry.pending > 0 || entry.connection.inUse;

export const isIdleEntryOf = (
  entry: Entry,
  agentId: string | undefined,
): boolean =>
  (agentId ?? entry.agentId) === entry.agentId && !entryInUse(entry);

export const entryAuthentication = async (
  entry: Entry,
): Promise<ConnectionAuthentication> => {
  const connection = await entry.connecting;

  const authentication = connection.getAuthentication();

  if (!authentication) throw new Error('Authentication is unavailable');

  return authentication;
};

const sameProject = (entry: Entry, agent: string, project: string): boolean =>
  entry.agentId === agent && entry.projectId === project;

export const pendingAuthentication = (
  entries: Set<Entry>,
  agent: string,
  project: string,
): Entry | undefined =>
  [...entries].find(
    (entry) =>
      sameProject(entry, agent, project) && entry.connection.authenticating,
  );
