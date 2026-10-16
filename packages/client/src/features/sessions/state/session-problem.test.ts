import { type Notice, SessionOpenFailure, type TurnEnd } from '@repo/contracts';
import { expect, it } from 'vitest';
import type { FeedViewItem } from '#features/feed';
import { type OpenAttempt, sessionProblem } from './session-problem';

const idle: OpenAttempt = { submittedAt: 0, error: null, isPending: false };

const launchFailure = (message: string): SessionOpenFailure =>
  new SessionOpenFailure({ type: 'failed', message });

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

const agentExited = 'Agent exited';

const quiet = { feedOpenError: null, retry: idle, commands: [], items: [] };

it('shows the open the Feed closed on', () => {
  expect(
    sessionProblem({
      ...quiet,
      feedOpenError: new SessionOpenFailure({ type: 'auth-required' }),
    }),
  ).toEqual({ type: 'open', error: { type: 'auth-required' } });
});

it('shows any other Feed closure as a launch failure', () => {
  expect(
    sessionProblem({ ...quiet, feedOpenError: new Error(agentExited) }),
  ).toEqual({
    type: 'open',
    error: { type: 'failed', message: agentExited },
  });
});

it('waits on a running Retry', () => {
  expect(
    sessionProblem({
      ...quiet,
      feedOpenError: launchFailure('first'),
      retry: { submittedAt: 2, error: null, isPending: true },
    }),
  ).toEqual({ type: 'retrying' });
});

const attempt = (submittedAt: number, message: string): OpenAttempt => ({
  submittedAt,
  error: launchFailure(message),
  isPending: false,
});

it.each([
  {
    latest: 'prompt',
    retry: attempt(2, 'retry'),
    prompt: attempt(3, 'prompt'),
  },
  { latest: 'retry', retry: attempt(2, 'retry'), prompt: attempt(1, 'prompt') },
])(
  'shows the $latest’s open failure when it is the latest attempt',
  ({ latest, retry, prompt }) => {
    expect(
      sessionProblem({
        ...quiet,
        feedOpenError: launchFailure('first'),
        retry,
        commands: [prompt],
      }),
    ).toEqual({ type: 'open', error: { type: 'failed', message: latest } });
  },
);

it('leaves a prompt’s other errors to the Composer', () => {
  expect(
    sessionProblem({
      ...quiet,
      commands: [
        { submittedAt: 1, error: new Error('Offline'), isPending: false },
      ],
    }),
  ).toBeUndefined();
});

it('clears once a Retry opens the Session', () => {
  expect(
    sessionProblem({
      ...quiet,
      retry: { submittedAt: 2, error: null, isPending: false },
      commands: [
        { submittedAt: 1, error: launchFailure('prompt'), isPending: false },
      ],
    }),
  ).toBeUndefined();
});

// A Retry that opened the Session cleared the Feed's closure, so any closure now is a later one.
it('shows a Feed closure that came after a Retry opened the Session', () => {
  expect(
    sessionProblem({
      ...quiet,
      feedOpenError: new Error(agentExited),
      retry: { submittedAt: 2, error: null, isPending: false },
    }),
  ).toEqual({
    type: 'open',
    error: { type: 'failed', message: agentExited },
  });
});

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
  {
    case: 'a sign-in answered it',
    items: [signInExpired],
    signedInAfter: 'end-1',
  },
  { case: 'the Turn ended well', items: [endTurn] },
  { case: 'a later Turn ended well', items: [signInExpired, endTurn] },
])('asks nothing once $case', ({ items, signedInAfter }) => {
  expect(sessionProblem({ ...quiet, items, signedInAfter })).toBeUndefined();
});
