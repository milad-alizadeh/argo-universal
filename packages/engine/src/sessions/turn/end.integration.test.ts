import { expect, it } from 'vitest';
import { sessionTurn } from '.';
import {
  endContext,
  startContext,
  turnId,
  withTurnStore,
} from './turn.test.mocks';

const { commit, storedTurn } = withTurnStore();

it('ends a Turn through its Feed, which commits the stored Turn with the Turn end', (): void => {
  commit(sessionTurn.start(startContext, turnId));

  const step = sessionTurn.end(endContext(), {
    stopReason: 'max_tokens',
    usage: { inputTokens: 3, outputTokens: 4, totalTokens: 7 },
  });

  expect(step.writes).toEqual([]);
  expect(step.change).toMatchObject({
    activeTurnId: null,
    activeTurnStartedAt: null,
    permissionQueue: [],
    elicitationQueue: [],
    storageFailedTurn: false,
  });
  expect(step.feed).toEqual([
    expect.objectContaining({
      type: 'feed.completeTurn',
      turnId: turnId,
      ending: {
        kind: 'completion',
        turnEnd: { stopReason: 'max_tokens', error: null, durationMs: 75 },
      },
    }),
  ]);
  commit(step);
  expect(storedTurn()).toMatchObject({
    status: 'ended',
    stopReason: 'max_tokens',
    endedAt: 175,
  });
});

it('writes the ended Turn directly once its Feed has ended', (): void => {
  commit(sessionTurn.start(startContext, turnId));

  const step = sessionTurn.end(endContext({ feedEnded: true }), {
    stopReason: 'cancelled',
  });

  expect(step.feed).toEqual([]);
  commit(step);
  expect(storedTurn()).toMatchObject({
    status: 'ended',
    stopReason: 'cancelled',
  });
});

it('ends a Turn whose storage failed as interrupted, whatever the Agent reported', (): void => {
  const step = sessionTurn.end(endContext({ storageFailedTurn: true }), {
    stopReason: 'end_turn',
  });

  expect(step.feed).toEqual([
    expect.objectContaining({
      ending: {
        kind: 'completion',
        turnEnd: {
          stopReason: 'error',
          error: {
            code: 'interrupted',
            message: 'Storage is failing, so the Turn was cancelled',
          },
          durationMs: 75,
        },
      },
    }),
  ]);
});

it('ends no Turn when none is active, and only clears the Session', (): void => {
  const step = sessionTurn.end(endContext({ activeTurnId: null }), {
    stopReason: 'cancelled',
  });

  expect(step.feed).toEqual([]);
  expect(step.writes).toEqual([]);
  expect(step.change).toMatchObject({ activeTurnId: null });
});

it('reports a lost Agent connection as an interrupted Turn', (): void => {
  expect(sessionTurn.connectionLost).toEqual({
    stopReason: 'error',
    error: {
      code: 'interrupted',
      message: 'The Agent connection failed during the Turn',
    },
  });
});
