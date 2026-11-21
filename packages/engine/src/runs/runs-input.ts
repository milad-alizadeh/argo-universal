import type { Database } from '@repo/db';
import type { WriterActorRef } from '../storage';
import type { TerminalSpawner } from './terminal';

// The Checkout a Run belongs to: Sessions on the same one see the same Runs.
export type RunCheckout = { projectId: string; checkoutPath: string };

// The Session that asks, named in a refusal when its Run holds a port someone else wants.
export type RunStarter = { id: string; title: string };

// A Run Configuration's Checkout, and the Session that asks for its Run.
export type RunRequest = RunCheckout & {
  starter?: RunStarter;
  manual?: boolean;
  automatic?: boolean;
  requireOpenSession?: () => void;
};

export type RunsInput = {
  database: Database;
  writer: WriterActorRef;
  home: string;
  spawn: TerminalSpawner;
  recordShellOwner: (
    pid: number,
    token: string,
  ) => Promise<() => Promise<void>>;
  now: () => number;
  createId: () => string;
  // Whether nothing listens on a port; tests do not replace it.
  portFree?: (port: number) => Promise<boolean>;
};
