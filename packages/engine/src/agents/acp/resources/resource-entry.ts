import type { DeferredAgentLaunch } from '../..';
import type { ConnectionAuthentication } from '../../auth/authenticate';
import type { AcpConnection } from '../connection/connection';
import type { SessionProcessAccess } from './resource-types';

export type Entry = {
  agentId: string;
  projectId: string;
  version: string;
  directory?: string;
  connecting: Promise<AcpConnection>;
  connection: AcpConnection;
  pending: number;
  dropped: boolean;
  access?: SessionProcessAccess;
  resolving: AbortController;
};

type EntryConnection = Pick<Entry, 'connecting' | 'access'>;

export const createEntry = (
  launch: DeferredAgentLaunch,
  connection: AcpConnection,
  { connecting, access }: EntryConnection,
): Entry => ({
  access,
  agentId: launch.agentId,
  projectId: launch.projectId,
  version: launch.version,
  connecting,
  connection,
  ...entryLifetime(),
});

export const entryInUse = (entry: Entry): boolean =>
  entry.pending > 0 || entry.connection.inUse;

// Shutdown can land while the connection is still starting, so `stopped` is read again once it resolves.
export const entryAuthentication = async (
  entry: Entry,
  stopped: () => boolean,
): Promise<ConnectionAuthentication> => {
  const authentication = (await entry.connecting).getAuthentication();

  if (stopped()) throw new Error('ACP resources are stopped');

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
      !entry.access &&
      sameProject(entry, agent, project) &&
      entry.connection.authenticating,
  );

const entryLifetime = (): Pick<Entry, 'pending' | 'dropped' | 'resolving'> => ({
  pending: 0,
  dropped: false,
  resolving: new AbortController(),
});
