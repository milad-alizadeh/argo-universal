import {
  type SessionOpenError,
  SessionOpenFailure,
  SessionOpenFailureResponse,
  sessionOpenErrorText,
} from '@repo/contracts';
import { errorMessage } from '@repo/kit/error-toast';
import { TRPCClientError } from '@trpc/client';
import type { ConnectionState } from '#features/connection';

// The same failure reads the same on every Sessions page.
export const serverSilentMessage =
  "The Server didn't respond. Check that it's running.";

export const sessionOpenFailedTitle = "Couldn't open the Session";

/*
 * The one reader of the Engine's SessionOpenError contract: the sign-in or launch failure
 * an open carries, from a Feed closure or a tRPC error. Undefined means it is not an open
 * failure: a dropped Connection, a failed read or any other error.
 */
export function decodeOpenFailure(
  cause: unknown,
): SessionOpenError | undefined {
  if (cause instanceof SessionOpenFailure) return cause.openError;
  const parsed = SessionOpenFailureResponse.safeParse(cause);

  return parsed.success ? parsed.data.data.openError : undefined;
}

// tRPC gave up on the call with no answer from the Server.
const unanswered = (cause: unknown): boolean =>
  cause instanceof TRPCClientError && cause.shape === undefined;

// The Server answered that no Session has the id: a link to a deleted Session, or a mistyped one.
export const sessionMissing = (cause: unknown): boolean =>
  cause instanceof TRPCClientError && cause.data?.code === 'NOT_FOUND';

/*
 * The Connection dropped the call: it was down when the call failed with no answer. A call
 * that fails with no answer while the Connection is up failed, and shows Failed to Launch.
 */
export const connectionDropped = (
  cause: unknown,
  connection: ConnectionState,
): boolean => connection !== 'open' && unanswered(cause);

/*
 * What a failed open shows (ADR-0004): the sign-in or launch failure it carries, and any other
 * error as Failed to Launch with Retry. No error shows none. Callers leave out an open the
 * Connection dropped: a toast says why.
 */
export function openErrorOf(cause: unknown): SessionOpenError | undefined {
  if (!cause) return undefined;

  return (
    decodeOpenFailure(cause) ?? { type: 'failed', message: errorMessage(cause) }
  );
}

// The words of a failed open, where no callout draws it.
export function openFailureText(cause: unknown): string | undefined {
  const failure = openErrorOf(cause);

  return failure && sessionOpenErrorText(failure);
}
