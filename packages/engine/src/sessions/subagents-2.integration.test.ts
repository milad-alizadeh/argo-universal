import { turn } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { insertSession } from '#mocks/database';

const latestTurn = {
  id: 'latest',
  sessionId: 'child',
  status: 'ended',
  model: 'small',
  startedAt: 10,
  endedAt: 24,
  stopReason: 'end_turn',
  usage: { totalTokens: 10, inputTokens: 2, outputTokens: 8 },
} as const;

it('shows the latest running child Turn without changing parent prompt readiness', async (): Promise<void> => {
  const host = await startAcpEngine();
  insertSession(host.database, { id: 'child', parentSessionId: 'session-1' });
  host.database
    .insert(turn)
    .values([
      { ...latestTurn, id: 'older', startedAt: 0 },
      {
        ...latestTurn,
        status: 'running',
        endedAt: null,
        stopReason: null,
        usage: null,
      },
    ])
    .run();

  const snapshot = await waitForAcpSnapshot(host, 'session-1', () => true);

  expect(snapshot).toMatchObject({
    state: 'idle',
    activeTurnId: null,
    subagents: [
      { state: 'running', stopReason: null, durationMs: null, tokens: null },
    ],
  });
});

it('rejects a malformed child Turn without hiding a healthy Subagent', async (): Promise<void> => {
  const host = await startAcpEngine();
  insertSession(host.database, { id: 'child', parentSessionId: 'session-1' });
  insertSession(host.database, {
    id: 'bad-child',
    parentSessionId: 'session-1',
  });
  host.database
    .insert(turn)
    .values([
      latestTurn,
      {
        ...latestTurn,
        id: 'bad',
        sessionId: 'bad-child',
        usage: { invalid: true },
      },
    ])
    .run();

  const snapshot = await waitForAcpSnapshot(host, 'session-1', () => true);

  expect(snapshot.subagents).toMatchObject([{ sessionId: 'child' }]);
  expect(snapshot.subagents).toHaveLength(1);
});

it('rejects Subagent queries for an unknown parent Session', async (): Promise<void> => {
  const { caller } = await startAcpEngine();

  await expect(
    caller.session.listAgents({ sessionId: 'missing' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
