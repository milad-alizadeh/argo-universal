import type { DeferredAgentLaunch } from '../..';
import type { ConnectionAuthentication } from '../../auth/authenticate';
import type { AcpConnection } from '../connection/connection';

export type Entry = {
  agentId: string;
  projectId: string;
  version: string;
  directory?: string;
  connecting: Promise<AcpConnection>;
  connection: AcpConnection;
  pending: number;
  dropped: boolean;
  /** Aborts the launch's download once every opener has withdrawn. */
  resolving: AbortController;
};

export const createEntry = (
  launch: DeferredAgentLaunch,
  connection: AcpConnection,
  connecting: Promise<AcpConnection>,
): Entry => ({
  agentId: launch.agentId,
  projectId: launch.projectId,
  version: launch.version,
  connecting,
  connection,
  pending: 0,
  dropped: false,
  resolving: new AbortController(),
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
      sameProject(entry, agent, project) && entry.connection.authenticating,
  );
