import type { AgentLaunch, DeferredAgentLaunch } from '../..';
import type { AcpConnection } from '../connection/connection';
import type { Entry } from './resource-entry';

// What the shared resources lend a starting connection; a failed start is forgotten.
type EntryOwner = { stopped: () => boolean; forget: () => void };

export const startEntry = (
  entry: Entry,
  launch: DeferredAgentLaunch,
  owner: EntryOwner,
): Promise<AcpConnection> =>
  connectEntry(entry, launch, owner.stopped).catch((cause: unknown) => {
    owner.forget();
    throw cause instanceof Error ? cause : new Error(String(cause));
  });

// Only a new connection resolves the launch's command.
const connectEntry = (
  entry: Entry,
  launch: DeferredAgentLaunch,
  stopped: () => boolean,
): Promise<AcpConnection> =>
  resolveEntry(entry, launch, stopped).then((resolved) =>
    entry.connection.start(resolved),
  );

// The connection owns the launch's folder before its download reservation goes.
const resolveEntry = async (
  entry: Entry,
  launch: DeferredAgentLaunch,
  stopped: () => boolean,
): Promise<AgentLaunch> => {
  const resolved = await launch.resolve(entry.resolving.signal);
  entry.directory = resolved.installationDirectory;
  resolved.release?.();

  entry.resolving.signal.throwIfAborted();

  if (stopped()) throw new Error('ACP resources are stopped');

  return sessionLaunch(entry, resolved);
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

const sessionLaunch = (entry: Entry, launch: AgentLaunch): AgentLaunch => ({
  ...launch,
  argo: entry.access?.environment,
});
