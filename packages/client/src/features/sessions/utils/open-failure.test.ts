import {
  authRequiredMessage,
  SessionOpenFailure,
  type SessionOpenError,
} from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  dropped,
  openFailure,
  serverError,
} from '../../../../mocks/sessions/open-failure.mocks';
import {
  connectionDropped,
  decodeOpenFailure,
  openErrorOf,
  openFailureText,
} from './open-failure';

const authRequiredOpen: SessionOpenError = { type: 'auth-required' };

const launchFailure: SessionOpenError = {
  type: 'failed',
  message: 'Agent exited with status 17\nAgent fixture failed',
};

const refused = 'The Agent refused';

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
  { case: 'a call with no answer from the Server', cause: dropped, is: true },
  { case: 'a Server error', cause: serverError, is: false },
  { case: 'a refused open', cause: openFailure(launchFailure), is: false },
  { case: 'an error outside tRPC', cause: new Error(refused), is: false },
  { case: 'no error', cause: null, is: false },
])('tells whether the Connection dropped $case', ({ cause, is }) => {
  expect(connectionDropped(cause)).toBe(is);
});

it.each([
  {
    case: 'the sign-in a refused open asks for',
    cause: openFailure(authRequiredOpen),
    error: authRequiredOpen,
  },
  {
    case: 'the launch failure a refused open carries',
    cause: openFailure(launchFailure),
    error: launchFailure,
  },
  {
    case: 'a Server error with no open failure as a launch failure',
    cause: serverError,
    error: { type: 'failed', message: serverError.message },
  },
  {
    case: 'any other error as a launch failure',
    cause: new Error(refused),
    error: { type: 'failed', message: refused },
  },
])('shows $case', ({ cause, error }) => {
  expect(openErrorOf(cause)).toEqual(error);
});

it.each([
  { case: 'a dropped Connection', cause: dropped },
  { case: 'no error', cause: null },
])('leaves $case to the toast', ({ cause }) => {
  expect(openErrorOf(cause)).toBeUndefined();
});

it.each([
  { cause: openFailure(authRequiredOpen), text: authRequiredMessage },
  { cause: openFailure(launchFailure), text: launchFailure.message },
  {
    cause: new SessionOpenFailure(authRequiredOpen),
    text: authRequiredMessage,
  },
  { cause: new Error(refused), text: refused },
  { cause: dropped, text: undefined },
])('reads $text from a failed open', ({ cause, text }) => {
  expect(openFailureText(cause)).toBe(text);
});
