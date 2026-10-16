import {
  SessionOpenError,
  SessionOpenFailure,
  SessionOpenFailureResponse,
} from '@repo/contracts';

const typedOpenErrorMessage = (error: SessionOpenError): string =>
  error.type === 'auth-required' ? 'Authentication required' : error.message;

// The same failure reads the same on every Sessions page.
export const serverSilentMessage =
  "The Server didn't respond. Check that it's running.";

export const sessionOpenFailedTitle = "Couldn't open the Session";

export const sessionOpenErrorMessage = (cause: unknown): string => {
  if (cause instanceof SessionOpenFailure)
    return typedOpenErrorMessage(cause.openError);
  const parsed = SessionOpenFailureResponse.safeParse(cause);

  if (parsed.success) return typedOpenErrorMessage(parsed.data.data.openError);

  return errorMessage(cause);
};

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);
