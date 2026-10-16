import type { SessionOpenError } from '@repo/contracts';

// New Session's open: fine, failed, or opening again with the failure still on show until it settles.
export type OpenAttempt =
  | { status: 'idle' }
  | { status: 'failed'; error: SessionOpenError }
  | { status: 'retrying'; error: SessionOpenError };

// What asked New Session to open again.
export type OpenAgain =
  // Retry, or a finished sign-in: a New worktree sends the Composer's current draft again.
  | { by: 'user'; sendDraft: () => void }
  // The Connection reopened: only a Local checkout opens again.
  | { by: 'connection' };
