import { SessionOpenFailure } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  dropped,
  serverError,
} from '../../../../mocks/sessions/open-failure.mocks';
import { type OpenAttempt, sessionProblem } from './session-problem';

const idle: OpenAttempt = { submittedAt: 0, error: null, isPending: false };

const launchFailure = (message: string): SessionOpenFailure =>
  new SessionOpenFailure({ type: 'failed', message });

const agentExited = 'Agent exited';

const launchFailed = (message: string): ReturnType<typeof sessionProblem> => ({
  type: 'open',
  error: { type: 'failed', message },
});

const quiet = {
  feedOpenError: null,
  feedDropped: false,
  retry: idle,
  retryDropped: false,
  commands: [],
  items: [],
};

it('shows the open the Feed closed on', () => {
  expect(
    sessionProblem({
      ...quiet,
      feedOpenError: new SessionOpenFailure({ type: 'auth-required' }),
    }),
  ).toEqual({ type: 'open', error: { type: 'auth-required' } });
});

it('asks nothing when the Feed drops with the Connection', () => {
  expect(
    sessionProblem({ ...quiet, feedOpenError: dropped, feedDropped: true }),
  ).toBeUndefined();
});

const failedRetry = (error: Error): OpenAttempt => ({
  submittedAt: 2,
  error,
  isPending: false,
});

// A call with no answer is a drop only by the Connection's state, so with it up it is a failure too.
it.each([
  { case: 'the Feed closes on a Server error', cause: serverError, feed: true },
  { case: 'a Retry fails on a Server error', cause: serverError, feed: false },
  { case: 'the Feed ends with no answer', cause: dropped, feed: true },
  { case: 'a Retry gets no answer', cause: dropped, feed: false },
])(
  'shows a launch failure when $case with the Connection up',
  ({ cause, feed }) => {
    const sources = feed
      ? { feedOpenError: cause }
      : { retry: failedRetry(cause) };

    expect(sessionProblem({ ...quiet, ...sources })).toEqual(
      launchFailed(cause.message),
    );
  },
);

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
    ).toEqual(launchFailed(latest));
  },
);

// The toast says why; the Retry runs again when the Connection reopens.
it('puts an older closure away when the Connection drops a Retry', () => {
  expect(
    sessionProblem({
      ...quiet,
      feedOpenError: launchFailure('first'),
      retry: failedRetry(dropped),
      retryDropped: true,
    }),
  ).toBeUndefined();
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

// A Retry that opened the Session cleared the Feed's closure, so any closure now is a later one.
it('shows a Feed closure that came after a Retry opened the Session', () => {
  expect(
    sessionProblem({
      ...quiet,
      feedOpenError: launchFailure(agentExited),
      retry: { submittedAt: 2, error: null, isPending: false },
    }),
  ).toEqual(launchFailed(agentExited));
});
