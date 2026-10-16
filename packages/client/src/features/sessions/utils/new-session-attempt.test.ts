import type { SessionOpenError } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import {
  dropped,
  openFailure,
  serverError,
} from '../../../../mocks/sessions/open-failure.mocks';
import type { NewSessionOutcome } from '../types/new-session-attempt';
import {
  failedOpen,
  failedToOpen,
  openingAgain,
  retriedLocal,
} from './new-session-attempt';

const launchFailure: SessionOpenError = {
  type: 'failed',
  message: 'The Agent did not start',
};

const idle: NewSessionOutcome = {
  attempt: { status: 'idle' },
  connectionError: undefined,
};

const failed: NewSessionOutcome = {
  attempt: { status: 'failed', error: launchFailure },
  connectionError: undefined,
};

const retrying: NewSessionOutcome = {
  attempt: { status: 'retrying', error: launchFailure },
  connectionError: undefined,
};

const droppedOpen: NewSessionOutcome = {
  attempt: { status: 'idle' },
  connectionError: dropped,
};

describe('failedOpen', () => {
  it.each([
    {
      case: 'the Agent’s sign-in, for the callout',
      cause: openFailure({ type: 'auth-required' }),
      outcome: {
        attempt: { status: 'failed', error: { type: 'auth-required' } },
        connectionError: undefined,
      },
    },
    {
      case: 'the Agent’s launch failure, with Retry',
      cause: openFailure(launchFailure),
      outcome: failed,
    },
    {
      case: 'a Server error as a launch failure, with Retry',
      cause: serverError,
      outcome: {
        attempt: {
          status: 'failed',
          error: { type: 'failed', message: serverError.message },
        },
        connectionError: undefined,
      },
    },
    {
      case: 'a dropped Connection as no failure, for a toast',
      cause: dropped,
      outcome: droppedOpen,
    },
  ])('fails with $case', ({ cause, outcome }) => {
    expect(failedOpen(cause)).toEqual(outcome);
  });
});

describe('openingAgain', () => {
  it.each([
    { case: 'keeps a failure on show', from: failed, to: retrying },
    { case: 'keeps a retried failure on show', from: retrying, to: retrying },
    { case: 'is done with a dropped Connection', from: droppedOpen, to: idle },
    { case: 'leaves a fine open fine', from: idle, to: idle },
  ])('$case', ({ from, to }) => {
    expect(openingAgain(from)).toEqual(to);
  });
});

describe('retriedLocal', () => {
  it.each([
    { case: 'opens a failed open again', from: failed, to: retrying },
    { case: 'opens a dropped open again', from: droppedOpen, to: idle },
  ])('$case', ({ from, to }) => {
    expect(retriedLocal(from, true)).toEqual(to);
  });

  it.each([
    { case: 'shows a retried failure again', from: retrying, to: failed },
    { case: 'keeps a failure', from: failed, to: failed },
    { case: 'keeps a dropped Connection', from: droppedOpen, to: droppedOpen },
    { case: 'keeps a fine open fine', from: idle, to: idle },
  ])('with nothing to open, $case', ({ from, to }) => {
    expect(retriedLocal(from, false)).toEqual(to);
  });
});

describe('failedToOpen', () => {
  it.each([
    { case: 'a failed open', outcome: failed, is: true },
    { case: 'a retried open', outcome: retrying, is: true },
    { case: 'an open the Connection dropped', outcome: droppedOpen, is: true },
    { case: 'a fine open', outcome: idle, is: false },
  ])('opens again on reconnect after $case: $is', ({ outcome, is }) => {
    expect(failedToOpen(outcome)).toBe(is);
  });
});
