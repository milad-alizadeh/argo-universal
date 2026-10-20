import type { ConnectionState } from '#features/connection';
import type { NewSessionOutcome } from '../types/new-session-attempt';
import { connectionDropped, openErrorOf } from './open-failure';

export const settledOpen: NewSessionOutcome = {
  attempt: { status: 'idle' },
  connectionError: undefined,
};

// Opening again keeps the Agent's failure on show until the open settles; a dropped Connection's toast is done with.
export const openingAgain = ({
  attempt,
}: NewSessionOutcome): NewSessionOutcome => ({
  attempt:
    attempt.status === 'idle'
      ? attempt
      : { status: 'retrying', error: attempt.error },
  connectionError: undefined,
});

/*
 * An open the Connection dropped, as its state was when the open failed, leaves the attempt idle
 * for a toast; any other failure fails it, for the callout and Retry.
 */
export const failedOpen = (
  cause: unknown,
  connection: ConnectionState,
): NewSessionOutcome => {
  const error = connectionDropped(cause, connection)
    ? undefined
    : openErrorOf(cause);

  return error
    ? { attempt: { status: 'failed', error }, connectionError: undefined }
    : { ...settledOpen, connectionError: cause };
};

// A failed open, or one the Connection dropped, opens again when the Connection reopens.
export const opensOnReconnect = ({
  attempt,
  connectionError,
}: NewSessionOutcome): boolean =>
  attempt.status !== 'idle' || connectionError !== undefined;
