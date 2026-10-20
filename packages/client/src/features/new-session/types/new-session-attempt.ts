import type { SessionOpenError } from '@repo/contracts';

// New Session's open: fine, failed, or opening again with the failure still on show until it settles.
export type NewSessionAttempt =
  | { status: 'idle' }
  | { status: 'failed'; error: SessionOpenError }
  | { status: 'retrying'; error: SessionOpenError };

// How New Session's open went: the Agent's failure, for the callout, or a dropped Connection, for a toast.
export interface NewSessionOutcome {
  // The Agent's sign-in or launch failure, which the callout answers. Retry or a second Send opens again; the failure stays until it settles.
  attempt: NewSessionAttempt;
  // The error of an open the Connection dropped: a toast says why, and the Connection reopening opens again.
  connectionError: unknown;
}

// What asked New Session to open again.
export type OpenAgain =
  // Retry, or a finished sign-in: a New worktree sends the Composer's current draft again.
  | { by: 'user'; sendDraft: () => void }
  // The Connection reopened: only a Local checkout opens again.
  | { by: 'connection' };
