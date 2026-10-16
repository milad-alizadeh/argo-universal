import { errorMessage } from '#lib/generic/error-toast';
import type { SessionCalloutProps } from '../types/session-callout';

export interface SignInRead {
  // Why the last read of the Agent's sign-in failed, if it did.
  error: unknown;
  // The Connection dropped the read, which runs again when the Connection reopens.
  dropped: boolean;
  // Reads the Agent's sign-in again.
  reread: () => void;
}

/*
 * The sign-in callout until the Agent's methods arrive: Loading…. A read the Server failed shows
 * Failed to Launch, whose Retry reads again; a read the Connection dropped keeps Loading….
 */
export const unreadSignIn = ({
  error,
  dropped,
  reread,
}: SignInRead): SessionCalloutProps =>
  error && !dropped
    ? { kind: 'launch', message: errorMessage(error), onRetry: reread }
    : { kind: 'loading' };
