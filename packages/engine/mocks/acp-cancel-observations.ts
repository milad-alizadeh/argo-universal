import type {
  FeedSubscribeOutput,
  FeedPageOutput,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import { vi, type MockInstance } from 'vitest';
import {
  playLateCancelUpdate,
  playCancelledToolUpdate,
} from './acp-cancel-delivery';
import type { startIgnoredCancelEngine } from './acp-cancel-timeout';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from './acp-feed';
import { closeStream, readThrough } from './feed-stream-reading';
import { requireScriptedProcessAt } from './scripted-agent';

type Host = Awaited<ReturnType<typeof startIgnoredCancelEngine>>['host'];
export const readCancelTurns = (host: Host, sessionId: string): unknown =>
  host.database.$client
    .prepare(
      'SELECT status, stop_reason FROM turn WHERE session_id = ? ORDER BY rowid',
    )
    .all(sessionId);
export const readCancelEnding = async (
  host: Host,
  sessionId: string,
): Promise<SessionUpdate[]> =>
  (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows.filter(
    (row) =>
      row.sessionUpdate === 'tool_call_update' ||
      row.sessionUpdate === 'notice',
  );
export const readCancelSibling = async (
  host: Host,
  sessionId?: string,
): Promise<SessionSnapshot['state'] | null> =>
  sessionId
    ? (await waitForAcpSnapshot(host, sessionId, () => true)).state
    : null;
export const finishCancelSibling = async (
  host: Host,
  sessionId?: string,
): Promise<void> => {
  if (sessionId) await waitForAcpSessionIdle(host, sessionId);
};

type LateCancelObservation = {
  changes: FeedSubscribeOutput[];
  diagnostics: string[];
  revisionBefore: number;
  revisionAfter: number;
};
const startLateObservation = async (
  host: Host,
  sessionId: string,
  marker: boolean,
): Promise<{
  page: FeedPageOutput;
  stream: AsyncIterator<FeedSubscribeOutput>;
  errors: MockInstance<typeof console.error>;
  observed: Promise<FeedSubscribeOutput[]>;
}> => {
  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });
  const stream = (
    await host.caller.feed.subscribe({
      sessionId,
      after: { epoch: page.epoch, revision: page.maxRevision },
    })
  )[Symbol.asyncIterator]();
  await stream.next();
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const observed = readThrough(
    stream,
    (event) =>
      event.type === 'snapshot' &&
      event.snapshot.configOptions.some(
        (option) =>
          option.configId === 'delivery-marker' &&
          option.currentValue === marker,
      ),
  );
  return { page, stream, errors, observed };
};
const rejectionLines = (calls: unknown[][], sessionId: string): string[] =>
  calls.flatMap(([line]) =>
    typeof line === 'string' &&
    line.startsWith(`feed ${sessionId}: rejected a change:`)
      ? [line]
      : [],
  );
export const observeLateCancelUpdate = async (
  host: Host,
  sessionId: string,
  marker: boolean,
): Promise<LateCancelObservation> => {
  const observation = await startLateObservation(host, sessionId, marker);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  try {
    await playLateCancelUpdate(
      requireScriptedProcessAt(host.agent.processes),
      marker,
    );
    const events = await observation.observed;
    return {
      changes: events.filter((event) => event.type.startsWith('row.')),
      diagnostics: rejectionLines(observation.errors.mock.calls, sessionId),
      revisionBefore: observation.page.maxRevision,
      revisionAfter: (
        await host.caller.feed.page({ sessionId, direction: 'tail' })
      ).maxRevision,
    };
  } finally {
    vi.useRealTimers();
    observation.errors.mockRestore();
    await closeStream(observation.stream);
  }
};
export const observeFencedCancelUpdate = async (
  host: Host,
  sessionId: string,
): Promise<string[]> => {
  const delivered = Promise.withResolvers<void>();
  const errors = vi.spyOn(console, 'error').mockImplementation((line) => {
    if (
      typeof line === 'string' &&
      line.startsWith(`feed ${sessionId}: rejected a change:`)
    )
      delivered.resolve();
  });
  try {
    await playCancelledToolUpdate(
      requireScriptedProcessAt(host.agent.processes),
    );
    await delivered.promise;
    return rejectionLines(errors.mock.calls, sessionId);
  } finally {
    errors.mockRestore();
  }
};
