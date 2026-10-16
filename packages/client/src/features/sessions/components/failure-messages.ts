import {
  SessionOpenFailureResponse,
  sessionOpenErrorText,
} from '@repo/contracts';

// The same failure reads the same on every Sessions page.
export const serverSilentMessage =
  "The Server didn't respond. Check that it's running.";

export const sessionOpenFailedTitle = "Couldn't open the Session";

// A Feed closure arrives as a SessionOpenFailure, whose message is the text.
export const sessionOpenErrorMessage = (cause: unknown): string => {
  const parsed = SessionOpenFailureResponse.safeParse(cause);

  if (parsed.success) return sessionOpenErrorText(parsed.data.data.openError);

  return errorMessage(cause);
};

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);
