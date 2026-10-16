import type { AgentLaunch, DeferredAgentLaunch } from '../..';
import type { AcpConnection } from '../connection/connection';
import type { Entry } from './resource-entry';
import type { AcpLaunch } from './resource-types';

// What the shared resources lend a starting connection; a failed start is forgotten.
type EntryOwner = { stopped: () => boolean; forget: () => void };

export const startEntry = (
  entry: Entry,
  launch: AcpLaunch,
  owner: EntryOwner,
): Promise<AcpConnection> =>
  connectEntry(entry, launch, owner.stopped).catch((cause: unknown) => {
    owner.forget();
    throw cause instanceof Error ? cause : new Error(String(cause));
  });

// A ready launch starts at once; only a new connection resolves a deferred one.
const connectEntry = (
  entry: Entry,
  launch: AcpLaunch,
  stopped: () => boolean,
): Promise<AcpConnection> => {
  if (!('resolve' in launch)) return entry.connection.start(launch);

  return resolveEntry(entry, launch, stopped).then((resolved) =>
    entry.connection.start(resolved),
  );
};

// The connection owns the launch's folder before its download reservation goes.
const resolveEntry = async (
  entry: Entry,
  launch: DeferredAgentLaunch,
  stopped: () => boolean,
): Promise<AgentLaunch> => {
  const resolved = await launch.resolve(entry.resolving.signal);
  entry.directory = resolved.installationDirectory;
  resolved.release?.();

  if (stopped()) throw new Error('ACP resources are stopped');

  return resolved;
};

// The download stops once every Session waiting on it has withdrawn.
export const withdrawResolving = (
  entry: Entry,
  signal: AbortSignal | undefined,
): void => {
  if (entry.pending === 0) abortWith(entry.resolving, signal);
};

const abortWith = (
  controller: AbortController,
  signal: AbortSignal | undefined,
): void => {
  if (signal?.aborted) controller.abort(signal.reason);
};
