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
    sessionProblem({ ...quiet, feedOpenError: new Error('Agent exited') }),
  ).toEqual({
    type: 'open',
    error: { type: 'failed', message: 'Agent exited' },
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

it('shows the latest attempt’s open failure', () => {
  const retry = {
    submittedAt: 2,
    error: launchFailure('retry'),
    isPending: false,
  };

  const prompt = {
    submittedAt: 3,
    error: launchFailure('prompt'),
    isPending: false,
  };

  expect(
    sessionProblem({
      ...quiet,
      feedOpenError: launchFailure('first'),
      retry,
      commands: [prompt],
    }),
  ).toEqual({ type: 'open', error: { type: 'failed', message: 'prompt' } });
  expect(
    sessionProblem({
      ...quiet,
      retry,
      commands: [{ ...prompt, submittedAt: 1 }],
    }),
  ).toEqual({ type: 'open', error: { type: 'failed', message: 'retry' } });
});

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

it('asks to sign in after a Turn that ended auth_required', () => {
  const end = turnEnd('end-1', {
    error: { code: -32000, message: 'Sign in to Codex' },
  });

  expect(sessionProblem({ ...quiet, items: [end] })).toEqual({
    type: 'turn',
    id: 'end-1',
    description: 'Sign in to Codex',
  });
  expect(
    sessionProblem({ ...quiet, items: [end], signedInAfter: 'end-1' }),
  ).toBeUndefined();
  expect(
    sessionProblem({
      ...quiet,
      items: [turnEnd('end-2', { stopReason: 'end_turn' })],
    }),
  ).toBeUndefined();
  expect(
    sessionProblem({
      ...quiet,
      items: [end, turnEnd('end-2', { stopReason: 'end_turn' })],
    }),
  ).toBeUndefined();
});
