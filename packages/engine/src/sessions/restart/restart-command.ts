import type { SessionRestart } from '@repo/contracts';

// What closes a Session's Agent session: a close, or a restart, which closes an idle Session so its Agent session opens again.
export type ClosingCommand =
  | { type: 'session.close' }
  | { type: 'session.restart'; restart: SessionRestart };
