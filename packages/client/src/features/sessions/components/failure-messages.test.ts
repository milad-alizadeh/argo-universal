import { SessionOpenFailure, type SessionOpenError } from '@repo/contracts';
import { expect, it } from 'vitest';
import { sessionOpenError, sessionOpenErrorMessage } from './failure-messages';

// The fields a tRPC client error carries for a rejected `session.new`.
const openFailure = (openError: SessionOpenError): Error =>
  Object.assign(new Error('Session session-1 closed'), {
    data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, openError },
  });

const authRequired = 'Authentication required';

const authRequiredOpen: SessionOpenError = { type: 'auth-required' };

const refused = 'The Agent refused';

it.each([
  {
    cause: openFailure(authRequiredOpen),
    message: authRequired,
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
    message: authRequired,
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
