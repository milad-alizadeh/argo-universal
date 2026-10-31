import {
  authRequiredMessage,
  SessionOpenFailure,
  type SessionOpenError,
} from '@repo/contracts';
import { expect, it } from 'vitest';
import type { ConnectionState } from '#features/connection';
import {
  dropped,
  openFailure,
  serverError,
  sessionNotFound,
} from '../../../../mocks/sessions/open-failure.mocks';
import {
  connectionDropped,
  decodeOpenFailure,
  openErrorOf,
  openFailureText,
  sessionMissing,
} from './open-failure';

const authRequiredOpen: SessionOpenError = { type: 'auth-required' };

const launchFailure: SessionOpenError = {
  type: 'failed',
  message: 'Agent exited with status 17\nAgent fixture failed',
};

const refused = 'The Agent refused';

const noAnswer = 'a call with no answer';

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

it.each<{ case: string; cause: unknown; connection: ConnectionState }>([
  { case: noAnswer, cause: dropped, connection: 'reconnecting' },
  { case: noAnswer, cause: dropped, connection: 'offline' },
])(
  'reads $case while the Connection is $connection as dropped',
  ({ cause, connection }) => {
    expect(connectionDropped(cause, connection)).toBe(true);
  },
);

it.each<{ case: string; cause: unknown; connection: ConnectionState }>([
  { case: noAnswer, cause: dropped, connection: 'open' },
  { case: 'a Server error', cause: serverError, connection: 'reconnecting' },
  {
    case: 'a refused open',
    cause: openFailure(launchFailure),
    connection: 'reconnecting',
  },
  {
    case: 'an error outside tRPC',
    cause: new Error(refused),
    connection: 'reconnecting',
  },
  { case: 'no error', cause: null, connection: 'reconnecting' },
])(
  'reads $case while the Connection is $connection as no drop',
  ({ cause, connection }) => {
    expect(connectionDropped(cause, connection)).toBe(false);
  },
);

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
    case: 'a call with no answer as a launch failure',
    cause: dropped,
    error: { type: 'failed', message: dropped.message },
  },
  {
    case: 'any other error as a launch failure',
    cause: new Error(refused),
    error: { type: 'failed', message: refused },
  },
])('shows $case', ({ cause, error }) => {
  expect(openErrorOf(cause)).toEqual(error);
});

it('shows nothing for no error', () => {
  expect(openErrorOf(null)).toBeUndefined();
});

it.each([
  { cause: openFailure(authRequiredOpen), text: authRequiredMessage },
  { cause: openFailure(launchFailure), text: launchFailure.message },
  {
    cause: new SessionOpenFailure(authRequiredOpen),
    text: authRequiredMessage,
  },
  { cause: new Error(refused), text: refused },
  { cause: null, text: undefined },
])('reads $text from a failed open', ({ cause, text }) => {
  expect(openFailureText(cause)).toBe(text);
});

it("reads the Server's NOT_FOUND as a Session that does not exist", () => {
  expect(sessionMissing(sessionNotFound)).toBe(true);
});

it.each([
  { case: 'a dropped Connection', cause: dropped },
  { case: 'a Server error', cause: serverError },
  { case: 'no error', cause: null },
])('does not read $case as a missing Session', ({ cause }) => {
  expect(sessionMissing(cause)).toBe(false);
});
