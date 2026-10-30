import { expect, it } from 'vitest';
import { openMemorySubagents } from '#mocks/memory-subagents';
import { sessionTurn } from '.';

type CrashContext = Parameters<typeof sessionTurn.crash>[0];

const failed = {
  type: 'acp.failed',
  error: new Error('Agent exited'),
} as const;

const crashContext = (overrides: Partial<CrashContext> = {}): CrashContext => ({
  activeTurnId: 'turn-1',
  turnEnding: { kind: 'completion' },
  subagents: { children: new Map(), pendingMessages: [] },
  input: { now: () => 200 },
  ...overrides,
});

it('joins an Agent crash to the ending of the Turn it cut short', (): void => {
  const step = sessionTurn.crash(crashContext(), failed, true);

  expect(step.feed).toEqual([]);
  expect(step.change).toEqual({
    turnEnding: {
      kind: 'agent_crash',
      occurredAt: 200,
      title: 'Agent exited',
      description: undefined,
    },
  });
});

it('announces an Agent crash at once when no Turn is running', (): void => {
  const step = sessionTurn.crash(
    crashContext({ activeTurnId: null }),
    failed,
    false,
  );

  expect(step.change).toBeUndefined();
  expect(step.feed).toEqual([
    expect.objectContaining({
      type: 'feed.turnEnding',
      turnId: null,
      ending: expect.objectContaining({ kind: 'agent_crash' }),
    }),
  ]);
});

it('ends each Subagent Turn through its Feed, then stores it, before the Session announces', (): void => {
  const { route, state } = openMemorySubagents();

  route({
    sessionId: 'acp-session',
    update: {
      sessionUpdate: 'subagent_update',
      sessionId: 'vendor-child',
      state: { state: 'running' },
    },
  });

  const step = sessionTurn.crash(
    crashContext({ activeTurnId: null, subagents: state() }),
    failed,
    false,
  );

  expect(step.writes).toEqual([]);
  expect(step.subagentTurns).toHaveLength(1);
  expect(step.subagentTurns[0]?.event).toMatchObject({
    type: 'feed.completeTurn',
    ending: { kind: 'agent_crash', occurredAt: 200 },
  });
  expect(step.subagentTurns[0]?.write.job.describe()).toContain('update Turn');
  expect(step.feed).toHaveLength(1);
});
