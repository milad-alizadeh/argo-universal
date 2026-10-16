import {
  authRequiredMessage,
  SessionOpenFailure,
  type SessionOpenError,
} from '@repo/contracts';
import { expect, it } from 'vitest';
import { sessionOpenError, sessionOpenErrorMessage } from './failure-messages';
import { openFailure } from './failure-messages.mocks';

const authRequiredOpen: SessionOpenError = { type: 'auth-required' };

const refused = 'The Agent refused';

it.each([
  {
    cause: openFailure(authRequiredOpen),
    message: authRequiredMessage,
  },
  {
    cause: openFailure({
      type: 'failed',
      message: 'Agent exited with status 17\nAgent fixture failed',
    }),
    message: 'Agent exited with status 17\nAgent fixture failed',
  },
  {
    cause: new SessionOpenFailure(authRequiredOpen),
    message: authRequiredMessage,
  },
  { cause: new Error(refused), message: refused },
])('reads $message from an open failure', ({ cause, message }) => {
  expect(sessionOpenErrorMessage(cause)).toBe(message);
});

it.each([
  {
    cause: openFailure(authRequiredOpen),
    openError: authRequiredOpen,
  },
  {
    cause: new SessionOpenFailure({ type: 'failed', message: 'Agent exited' }),
    openError: { type: 'failed', message: 'Agent exited' },
  },
  {
    cause: new Error(refused),
    openError: { type: 'failed', message: refused },
  },
])('reads the callout an open failure asks for', ({ cause, openError }) => {
  expect(sessionOpenError(cause)).toEqual(openError);
});
