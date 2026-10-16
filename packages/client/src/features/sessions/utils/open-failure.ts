import {
  type SessionOpenError,
  SessionOpenFailure,
  SessionOpenFailureResponse,
  sessionOpenErrorText,
} from '@repo/contracts';
import type { ErrorToast } from '#primitives/overlays/toast';

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

// The words of an open failure, where no callout draws it; undefined for any other error.
export function openFailureText(cause: unknown): string | undefined {
  const failure = decodeOpenFailure(cause);

  return failure && sessionOpenErrorText(failure);
}

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

// An open that failed short of the Agent shows the error toast, as a failed load does; the Agent's own failure is the callout's.
export function unreachedOpenToast(cause: unknown): ErrorToast | undefined {
  if (!cause || decodeOpenFailure(cause)) return undefined;

  return { title: sessionOpenFailedTitle, message: errorMessage(cause) };
}
