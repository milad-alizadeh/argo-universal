import type { LiveHeader, Turn } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { heldPlanProposal } from '#mocks/held-plan-proposal';
import { tool } from '#mocks/live-header-tool';
import { toFeedRowWrite } from '../../feed';
import { createLiveHeaderReader, type LiveSession } from './read';

const runningTurn: Turn = {
  id: 'turn-1',
  sessionId: 'session-1',
  status: 'running',
  startedAt: 50,
  endedAt: null,
  stopReason: null,
  error: null,
  usage: null,
  model: null,
};

const idleSession: LiveSession = {
  activeTurnId: null,
  activeTurnStartedAt: null,
  permissionQueue: [],
  elicitationQueue: [],
  planProposal: null,
};

const readingFirst = (startedAt: number): LiveHeader => ({
  text: 'Reading first.ts',
  source: { type: 'tool_call', toolCallId: 'tool-1' },
  startedAt,
});

function storedTool(): ReturnType<typeof openTestDatabase>['database'] {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  database
    .insert(feedRow)
    .values({ ...toFeedRowWrite(tool), sessionId: 'session-1' })
    .run();

  return database;
}

it.each([
  {
    rule: "the Session actor's active Turn",
    live: { ...idleSession, activeTurnId: 'turn-1', activeTurnStartedAt: 70 },
    latest: undefined,
    activeTurnId: 'turn-1',
    expected: readingFirst(70),
  },
  {
    rule: 'the running latest Turn without a Session actor',
    live: null,
    latest: runningTurn,
    activeTurnId: 'turn-1',
    expected: readingFirst(50),
  },
  {
    rule: 'no Turn when the Session actor has none, over a running latest Turn',
    live: idleSession,
    latest: runningTurn,
    activeTurnId: null,
    expected: null,
  },
  {
    rule: 'no Turn when the latest Turn ended and no Session actor is open',
    live: null,
    latest: { ...runningTurn, status: 'ended' as const },
    activeTurnId: null,
    expected: null,
  },
])(
  'chooses $rule and reads its Live header',
  ({ live, latest, activeTurnId, expected }): void => {
    const read = createLiveHeaderReader({ database: storedTool() });

    expect(
      read({
        sessionId: 'session-1',
        live,
        latestTurn: (): Turn | undefined => latest,
        memoryRows: {},
        writer: undefined,
      }),
    ).toEqual({ header: expected, activeTurnId, rejected: false });
  },
);

it('reads the latest Turn only without a Session actor', (): void => {
  const latestTurn: string[] = [];
  const read = createLiveHeaderReader({ database: storedTool() });

  for (const live of [idleSession, null])
    read({
      sessionId: 'session-1',
      live,
      latestTurn: (): undefined => {
        latestTurn.push(live ? 'Session actor' : 'no Session actor');
      },
      memoryRows: {},
      writer: undefined,
    });

  expect(latestTurn).toEqual(['no Session actor']);
});

it('reads Plan ready for a Plan proposal on the Session actor while a Turn runs', (): void => {
  const live: LiveSession = {
    ...idleSession,
    activeTurnId: 'turn-1',
    activeTurnStartedAt: 70,
    planProposal: heldPlanProposal('plan-1'),
  };

  expect(
    createLiveHeaderReader({ database: storedTool() })({
      sessionId: 'session-1',
      live,
      latestTurn: (): undefined => undefined,
      memoryRows: {},
      writer: undefined,
    }).header,
  ).toEqual({
    text: 'Plan ready',
    source: { type: 'request' },
    startedAt: 70,
  });
});
