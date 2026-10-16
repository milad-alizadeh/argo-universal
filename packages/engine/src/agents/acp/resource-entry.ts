import type { AgentLaunch } from '..';
import type { AcpConnection } from './connection';

export type Entry = {
  agentId: string;
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
