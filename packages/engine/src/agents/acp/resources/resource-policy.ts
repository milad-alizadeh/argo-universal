import type { DeferredAgentLaunch } from '../..';
import type { AcpConnection } from '../connection/connection';
import { entryInUse, type Entry } from './resource-entry';
import type { AcpResourceInput, SessionProcessAccess } from './resource-types';

type LaunchPolicy = { key: string; access?: SessionProcessAccess };

export const sessionResourceKey = (
  launch: DeferredAgentLaunch,
  sessionId?: string,
): string => JSON.stringify([launch.agentId, launch.projectId, sessionId]);

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

  const key = access
    ? sessionResourceKey(launch, sessionId)
    : JSON.stringify([launch.agentId, launch.projectId]);

  return { key, access };
}

function withdrawPrivateOpening(
  entry: Entry,
  signal: AbortSignal,
  stop: () => void,
): void {
  entry.access?.release();

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

  if (!entry.access || !signal) return;
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
  const dropped = !!entry.access || entry.dropped;

  return dropped && !entryInUse(entry);
}

export function stopResolving(entry: Entry): void {
  entry.resolving.abort();
  entry.access?.release();
}

function releaseAccess(entry: Entry): void {
  entry.access?.release();
}
