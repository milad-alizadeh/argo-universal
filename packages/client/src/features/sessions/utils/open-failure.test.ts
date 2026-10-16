import {
  authRequiredMessage,
  SessionOpenFailure,
  type SessionOpenError,
} from '@repo/contracts';
import { TRPCClientError } from '@trpc/client';
import { expect, it } from 'vitest';
import {
  decodeOpenFailure,
  openFailureText,
  unreachedOpenToast,
} from './open-failure';
import { openFailure, serverError } from './open-failure.mocks';

const authRequiredOpen: SessionOpenError = { type: 'auth-required' };

const launchFailure: SessionOpenError = {
  type: 'failed',
  message: 'Agent exited with status 17\nAgent fixture failed',
};

const refused = 'The Agent refused';

// The error a tRPC call gets when its WebSocket closes under it.
const dropped = TRPCClientError.from(new Error('WebSocket closed'));

it.each([
  { case: 'a refused tRPC open', cause: openFailure(authRequiredOpen) },
  {
    case: 'a Feed closure',
    cause: new SessionOpenFailure(authRequiredOpen),
  },
])('decodes the sign-in $case asks for', ({ cause }) => {
  expect(decodeOpenFailure(cause)).toEqual(authRequiredOpen);
});

it.each([
  { case: 'a refused tRPC open', cause: openFailure(launchFailure) },
  { case: 'a Feed closure', cause: new SessionOpenFailure(launchFailure) },
])('decodes the launch failure $case carries', ({ cause }) => {
  expect(decodeOpenFailure(cause)).toEqual(launchFailure);
});

it.each([
  { case: 'a dropped Connection', cause: dropped },
  { case: 'a Server error with no open failure', cause: serverError },
  { case: 'any other error', cause: new Error(refused) },
  { case: 'no error', cause: null },
])('reads $case as no open failure', ({ cause }) => {
  expect(decodeOpenFailure(cause)).toBeUndefined();
});

it.each([
  { cause: openFailure(authRequiredOpen), text: authRequiredMessage },
  { cause: openFailure(launchFailure), text: launchFailure.message },
  {
    cause: new SessionOpenFailure(authRequiredOpen),
    text: authRequiredMessage,
  },
  { cause: new Error(refused), text: undefined },
])('reads $text from an open failure', ({ cause, text }) => {
  expect(openFailureText(cause)).toBe(text);
});

it.each([
  { case: 'a dropped Connection', cause: dropped, message: 'WebSocket closed' },
  { case: 'any other error', cause: new Error(refused), message: refused },
])('toasts $case as a failed open', ({ cause, message }) => {
  expect(unreachedOpenToast(cause)).toEqual({
    title: "Couldn't open the Session",
    message,
  });
});

it.each([
  { case: 'a refused open', cause: openFailure(launchFailure) },
  { case: 'no error', cause: null },
])('leaves $case to the callout', ({ cause }) => {
  expect(unreachedOpenToast(cause)).toBeUndefined();
});
