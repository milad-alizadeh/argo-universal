import type { DeferredAgentLaunch } from '../..';
import type { AcpConnection } from '../connection/connection';
import {
  entryInUse,
  type Entry,
  type EntryKind,
  type PrivateEntry,
} from './resource-entry';
import type { AcpResourceInput, SessionProcessAccess } from './resource-types';

type LaunchPolicy = { key: string; kind: EntryKind };

export const sessionResourceKey = (
  launch: DeferredAgentLaunch,
  sessionId?: string,
): string => JSON.stringify([launch.agentId, launch.projectId, sessionId]);

const sharedResourceKey = (launch: DeferredAgentLaunch): string =>
  JSON.stringify([launch.agentId, launch.projectId]);

function sessionAccess(
  input: AcpResourceInput,
  launch: DeferredAgentLaunch,
  sessionId?: string,
): SessionProcessAccess | undefined {
  if (sessionId === undefined) return;

  return input.sessionAccess?.(sessionId, launch.projectId);
}

export function launchPolicy(
  input: AcpResourceInput,
  launch: DeferredAgentLaunch,
  sessionId?: string,
): LaunchPolicy {
  const access = sessionAccess(input, launch, sessionId);

  return access
    ? {
        key: sessionResourceKey(launch, sessionId),
        kind: { kind: 'private', access },
      }
    : { key: sharedResourceKey(launch), kind: { kind: 'shared' } };
}

function withdrawPrivateOpening(
  entry: PrivateEntry,
  signal: AbortSignal,
  stop: () => void,
): void {
  entry.access.release();

  if (entry.pending === 0) return;
  entry.resolving.abort(signal.reason);
  stop();
}

export function bindSessionAccess(
  entry: Entry,
  signal: AbortSignal | undefined,
  stop: () => void,
): void {
  entry.pending += 1;

  if (entry.kind === 'shared' || !signal) return;
  signal.addEventListener(
    'abort',
    () => withdrawPrivateOpening(entry, signal, stop),
    { once: true },
  );
}

export function forgetConnection(
  entries: Map<string, Entry>,
  connections: Set<Entry>,
  connection: AcpConnection,
): void {
  for (const [key] of [...entries].filter(
    ([, entry]) => entry.connection === connection,
  ))
    entries.delete(key);

  for (const entry of [...connections].filter(
    (item) => item.connection === connection,
  ))
    releaseAccess(entry);
}

export function canRetire(entry: Entry): boolean {
  const dropped = entry.kind === 'private' || entry.dropped;

  return dropped && !entryInUse(entry);
}

export function stopResolving(entry: Entry): void {
  entry.resolving.abort();
  releaseAccess(entry);
}

// Retiring a private connection ends its Session's access with it.
function releaseAccess(entry: Entry): void {
  if (entry.kind === 'private') entry.access.release();
}
