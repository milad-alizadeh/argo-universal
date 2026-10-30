import type { SubagentState, SubagentUpdate } from '@repo/contracts';
import { feedRow, turn } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { insertSession } from '#mocks/database';
import { toFeedRowWrite } from '../feed';

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

it('reads Subagents with only their latest Turn metrics through the stored Feed snapshot', async (): Promise<void> => {
  const host = await startAcpEngine();
  insertSession(host.database, {
    id: 'child',
    parentSessionId: 'session-1',
    title: 'Review',
  });
  insertSession(host.database, { id: 'other', parentSessionId: null });
  host.database
    .insert(turn)
    .values([
      { ...latestTurn, id: 'older', startedAt: 0, endedAt: 2, model: 'large' },
      latestTurn,
    ])
    .run();

  const snapshot = await waitForAcpSnapshot(host, 'session-1', () => true);

  expect(snapshot.subagents).toEqual([
    {
      sessionId: 'child',
      parentSessionId: 'session-1',
      readOnly: true,
      title: 'Review',
      toolCallId: null,
      role: null,
      state: 'idle',
      model: 'small',
      stopReason: 'end_turn',
      startedAt: 10,
      endedAt: 24,
      durationMs: 14,
      tokens: 10,
    },
  ]);
  expect(
    await host.caller.session.listAgents({ sessionId: 'session-1' }),
  ).toEqual(snapshot.subagents);
  expect(host.agent.processes).toHaveLength(0);
});

it.each(['running', 'idle', 'requires_action'] satisfies SubagentState[])(
  'preserves ACP %s even when a later association update omits state',
  async (subagentState): Promise<void> => {
    const host = await startAcpEngine();
    insertSession(host.database, { id: 'child', parentSessionId: 'session-1' });
    host.database.insert(turn).values(latestTurn).run();

    const update: SubagentUpdate = {
      id: 'association',
      sessionId: 'session-1',
      position: 1,
      revision: 1,
      turnId: null,
      state: 'settled',
      sessionUpdate: 'subagent_update',
      subagentSessionId: 'child',
      subagentState,
    };

    host.database
      .insert(feedRow)
      .values([
        { ...toFeedRowWrite(update), sessionId: 'session-1' },
        {
          ...toFeedRowWrite({
            ...update,
            id: 'title',
            position: 2,
            revision: 2,
            subagentState: undefined,
            title: 'Review',
          }),
          sessionId: 'session-1',
        },
      ])
      .run();

    const snapshot = await waitForAcpSnapshot(host, 'session-1', () => true);

    expect(snapshot.subagents).toMatchObject([
      { sessionId: 'child', state: subagentState },
    ]);
  },
);

it('shows a new Subagent with unknown metrics rather than invented work', async (): Promise<void> => {
  const host = await startAcpEngine();
  insertSession(host.database, { id: 'child', parentSessionId: 'session-1' });

  const snapshot = await waitForAcpSnapshot(host, 'session-1', () => true);

  expect(snapshot.subagents).toMatchObject([
    {
      state: 'idle',
      model: null,
      stopReason: null,
      startedAt: null,
      endedAt: null,
      durationMs: null,
      tokens: null,
    },
  ]);
});
