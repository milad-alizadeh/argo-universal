import type { SessionOpenError } from '@repo/contracts';
import { expect, it } from 'vitest';
import { dropped } from '../../../../mocks/sessions/open-failure.mocks';
import type { NewSessionOutcome } from '../types/new-session-attempt';
import { opensOnReconnect } from './new-session-attempt';

const launchFailure: SessionOpenError = {
  type: 'failed',
  message: 'The Agent did not start',
};

// The store suites prove how each outcome comes about; New Session's screen reads only this rule of it.
it.each<{ case: string; outcome: NewSessionOutcome; is: boolean }>([
  {
    case: 'a failed open',
    outcome: {
      attempt: { status: 'failed', error: launchFailure },
      connectionError: undefined,
    },
    is: true,
  },
  {
    case: 'a retried open',
    outcome: {
      attempt: { status: 'retrying', error: launchFailure },
      connectionError: undefined,
    },
    is: true,
  },
  {
    case: 'an open the Connection dropped',
    outcome: { attempt: { status: 'idle' }, connectionError: dropped },
    is: true,
  },
  {
    case: 'a fine open',
    outcome: { attempt: { status: 'idle' }, connectionError: undefined },
    is: false,
  },
])('opens again on reconnect after $case: $is', ({ outcome, is }) => {
  expect(opensOnReconnect(outcome)).toBe(is);
});
