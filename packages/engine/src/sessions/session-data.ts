import type { InitialConfigOption, SessionNewInput } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { Checkout } from '@repo/git';

// Prompted creation carries the first Turn's id.
export type SessionCreationInput = SessionNewInput & {
  projectPath: string;
  turnId: string;
  startedBySessionId?: string;
};

export type SessionInput = {
  database: Database;
  runtimeDirectory: string;
  sessionId: string;
} & (({ kind: 'new' } & SessionCreationInput) | { kind: 'existing' });

export type NewSessionInput = Extract<SessionInput, { kind: 'new' }>;

export interface SessionData {
  sessionId: string;
  projectId: string;
  agent: string;
  vendorSessionId: string | null;
  checkout: Checkout;
  // The values the Agent connects with: the `session.new` choices, then whatever the Agent last reported.
  configValues: InitialConfigOption[];
  heldConfig: InitialConfigOption[];
  epoch: number;
  maxRevision: number;
  activityAt: number;
  nextPosition: number;
  // Whether closing keeps the Session; a New Session no prompt reached is discarded instead.
  kept: boolean;
  // The latest Turn, when it was interrupted and its Feed does not yet say output may be missing.
  undisclosedInterruptedTurnId: string | null;
}
