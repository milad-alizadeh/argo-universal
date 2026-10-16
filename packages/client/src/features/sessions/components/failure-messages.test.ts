import { SessionOpenFailure, type SessionOpenError } from '@repo/contracts';
import { expect, it } from 'vitest';
import { sessionOpenErrorMessage } from './failure-messages';

// The fields a tRPC client error carries for a rejected `session.new`.
const openFailure = (openError: SessionOpenError): Error =>
  Object.assign(new Error('Session session-1 closed'), {
    data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, openError },
  });

it.each([
  {
    cause: openFailure({ type: 'auth-required' }),
    message: 'Authentication required',
  },
  {
    cause: openFailure({
      type: 'failed',
      message: 'Agent exited with status 17\nAgent fixture failed',
    }),
    message: 'Agent exited with status 17\nAgent fixture failed',
  },
  {
    cause: new SessionOpenFailure({ type: 'auth-required' }),
    message: 'Authentication required',
  },
  { cause: new Error('The Agent refused'), message: 'The Agent refused' },
])('reads $message from an open failure', ({ cause, message }) => {
  expect(sessionOpenErrorMessage(cause)).toBe(message);
});
