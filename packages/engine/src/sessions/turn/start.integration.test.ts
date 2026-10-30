import { expect, it } from 'vitest';
import { sessionTurn } from '.';
import { startContext, turnId, withTurnStore } from './turn.test.mocks';

const { commit, storedTurn } = withTurnStore();

it('starts a Turn: active, kept, and stored as running with the current model', (): void => {
  const step = sessionTurn.start(startContext, turnId);

  expect(step.change).toEqual({
    activeTurnId: turnId,
    activeTurnStartedAt: 100,
    turnEnding: { kind: 'completion' },
    kept: true,
  });
  commit(step);
  expect(storedTurn()).toMatchObject({
    sessionId: 'session-1',
    startedAt: 100,
    status: 'running',
    model: 'opus',
  });
});
