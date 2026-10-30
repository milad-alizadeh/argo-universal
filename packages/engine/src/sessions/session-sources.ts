import type { CoreHooks } from '@repo/contracts/plugins';
import type { Database } from '@repo/db';
import type { InstalledAgents } from '../agents';
import type { FeedDeps } from '../feed';
import type { OpenSessions } from './open-sessions';
import type { OpenSessionsActorRef } from './open-sessions-machine';
import type { createSessionReader } from './session-record';

// What the Engine runs Sessions with; its composition hands them to `Sessions` once.
export interface SessionSources extends Pick<
  FeedDeps,
  'findFeed' | 'findWriter'
> {
  database: Database;
  sessions: OpenSessionsActorRef;
  installedAgents: InstalledAgents;
  readSession: ReturnType<typeof createSessionReader>;
  createId: () => string;
  // Aborts when the Engine stops admitting Session commands.
  sessionCommandSignal?: AbortSignal;
  // Overrides how long New Session discovery waits for Slash commands (tests).
  commandsWaitMs?: number;
  // Plugin Hooks on starting a Session and submitting a prompt (ADR-0027).
  hooks: CoreHooks;
}

// The Session sources a handler reads beside the open Sessions, which stand in for their actor.
export type HandlerSource = Exclude<
  keyof SessionSources,
  'sessions' | 'sessionCommandSignal'
>;

// What one Session handler reads: the sources it names, and the open Sessions methods it calls.
export type HandlerSources<
  Source extends HandlerSource,
  Method extends keyof OpenSessions,
> = Pick<SessionSources, Source> & { open: Pick<OpenSessions, Method> };

// Everything Session handlers read; only the Sessions composition and its routers hold all of it.
export type SessionHandlerSources = HandlerSources<
  HandlerSource,
  keyof OpenSessions
>;
