import { showToast } from '@repo/kit/primitives/overlays/toast';
import {
  browseServers,
  type KnownServer,
  pairWithServer,
  resolveServer,
  type ServerAddress,
} from '#features/connection';
import type { PairDeps, PairFailure } from './pair-with-invite';
import type { TypedOutcome } from './pair-with-typed-code';

// Where the Add a Server pages are: reading a code, waiting on the owner, or told how it went.
export type PairPhase =
  | { phase: 'scanning' }
  // A typed code is being asked of the Servers on the network, which takes a moment before any of them can be named.
  | { phase: 'looking' }
  | { phase: 'waiting'; serverName: string }
  | { phase: 'failed'; serverName: string; outcome: PairFailure; typed?: true };

export interface Read {
  scanned: string;
  address?: ServerAddress;
}

// What the hook keeps between renders: the attempt in flight, and the last code read so it can be tried again.
export interface Held {
  running: AbortController | null;
  last: Read | null;
  // The code typed last, kept so a Server that was not found can be asked again without typing it twice.
  lastTyped: string | null;
}

// What every step reaches for: what is held, the page to draw, and what to do once paired.
export interface Hook {
  held: Held;
  setState: (state: PairPhase) => void;
  onPaired: (server: KnownServer) => void;
}

export const scanning: PairPhase = { phase: 'scanning' };

export const depsOf = (
  signal: AbortSignal,
  address?: ServerAddress,
): PairDeps => ({
  browse: browseServers,
  pair: pairWithServer,
  resolve: resolveServer,
  signal,
  address,
});

/*
 * The endings that have no page of their own, each a toast with the entry left for another try: an error the owner cannot act on, a typed code that is not right, and a source the Server has turned away for being wrong too often.
 */
const toasts = {
  failed: {
    title: 'Could not pair',
    message: 'The other computer did not accept this Device.',
  },
  mistyped: {
    title: 'That code is not right',
    message: 'Check the code on the other computer and type it again.',
  },
  'turned-away': {
    title: 'Too many tries',
    message: 'Wait a minute, then type the code again.',
  },
} as const;

// The endings that have a page of their own are everything the toasts above and a success do not cover.
const hasPage = (outcome: TypedOutcome): outcome is PairFailure =>
  outcome.kind !== 'paired' && !(outcome.kind in toasts);

// Where the page that ended an attempt names its Server, and whether the code was typed.
export interface Ended {
  serverName: string;
  typed?: true;
}

// How an attempt ended: paired, a page of its own that says what to do, or a toast with the entry left for another try.
export function settle(outcome: TypedOutcome, hook: Hook, ended: Ended): void {
  if (outcome.kind === 'paired') return hook.onPaired(outcome.server);

  if (hasPage(outcome))
    return hook.setState({ phase: 'failed', outcome, ...ended });
  showToast({ ...toasts[outcome.kind], tone: 'danger' });
  hook.setState(scanning);
}
