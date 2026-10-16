import type { Notice, TurnEnd } from '@repo/contracts';
import { expect, it } from 'vitest';
import type { FeedViewItem } from '#features/feed';
import { sessionProblem } from './session-problem';

const quiet = {
  feedOpenError: null,
  feedDropped: false,
  retry: { submittedAt: 0, error: null, isPending: false },
  retryDropped: false,
  commands: [],
  items: [],
};

const turnEnd = (id: string, end: Partial<TurnEnd>): FeedViewItem => {
  const row: Notice = {
    id,
    sessionId: 'session-1',
    turnId: 'turn-1',
    position: 1,
    revision: 1,
    state: 'settled',
    sessionUpdate: 'notice',
    severity: 'info',
    title: 'Turn ended',
  };

  return {
    type: 'turn_end',
    row,
    end: { stopReason: 'auth_required', error: null, durationMs: 10, ...end },
  };
};

const signInExpired = turnEnd('end-1', {
  error: { code: -32000, message: 'Sign in to Codex' },
});

const endTurn = turnEnd('end-2', { stopReason: 'end_turn' });

it('asks to sign in after a Turn that ended auth_required', () => {
  expect(sessionProblem({ ...quiet, items: [signInExpired] })).toEqual({
    type: 'turn',
    id: 'end-1',
    description: 'Sign in to Codex',
  });
});

it.each([
  { case: 'the Turn ended well', items: [endTurn] },
  { case: 'a later Turn ended well', items: [signInExpired, endTurn] },
])('asks nothing once $case', ({ items }) => {
  expect(sessionProblem({ ...quiet, items })).toBeUndefined();
});
