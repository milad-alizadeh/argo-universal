import {
  type SessionOpenError,
  SessionOpenFailure,
  SessionOpenFailureResponse,
  sessionOpenErrorText,
} from '@repo/contracts';
import { TRPCClientError } from '@trpc/client';
import { errorMessage } from '#lib/generic/error-toast';

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

// A call the Connection dropped: tRPC gave up on it with no answer from the Server, as when its WebSocket closed.
export const connectionDropped = (cause: unknown): boolean =>
  cause instanceof TRPCClientError && cause.shape === undefined;

const shownFailure = (cause: unknown): SessionOpenError =>
  decodeOpenFailure(cause) ?? { type: 'failed', message: errorMessage(cause) };

/*
 * What a failed open shows (ADR-0004): the sign-in or launch failure it carries, and any other
 * error as Failed to Launch with Retry. A dropped Connection, or no error, shows none: a toast says why.
 */
export function openErrorOf(cause: unknown): SessionOpenError | undefined {
  if (!cause || connectionDropped(cause)) return undefined;

  return shownFailure(cause);
}

// The words of a failed open, where no callout draws it; undefined for a dropped Connection.
export function openFailureText(cause: unknown): string | undefined {
  const failure = openErrorOf(cause);

  return failure && sessionOpenErrorText(failure);
}
