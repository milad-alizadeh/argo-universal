import { type PairingInvite, readPairingInvite } from '@repo/contracts';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useEffect, useState } from 'react';
import {
  browseServers,
  type KnownServer,
  pairWithServer,
  resolveServer,
  type ServerAddress,
} from '#features/connection';
import {
  type PairDeps,
  type PairFailure,
  type PairOutcome,
  pairWithInvite,
} from './pair-with-invite';

// Where the Add a Server pages are: reading a code, waiting on the owner, or told how it went.
export type PairPhase =
  | { phase: 'scanning' }
  | { phase: 'waiting'; serverName: string }
  | { phase: 'failed'; serverName: string; outcome: PairFailure };

export interface PairServer {
  state: PairPhase;
  // A code the camera read, or the one the owner was shown; anything that is not an Argo code is ignored.
  read: (scanned: string, address?: ServerAddress) => void;
  // Tries the code just read once more, for a Server that was not on the network a moment ago.
  retry: () => void;
  // Stops waiting and goes back to reading a code.
  back: () => void;
}

interface Read {
  scanned: string;
  address?: ServerAddress;
}

// What the hook keeps between renders: the attempt in flight, and the last code read so it can be tried again.
interface Held {
  running: AbortController | null;
  last: Read | null;
}

// What every step reaches for: what is held, the page to draw, and what to do once paired.
interface Hook {
  held: Held;
  setState: (state: PairPhase) => void;
  onPaired: (server: KnownServer) => void;
}

const scanning: PairPhase = { phase: 'scanning' };

/*
 * The App's side of Add a Server (ADR-0045). The wait is the Connection itself: the Server holds the Device until the owner answers, so there is no polling and no timer here, and a page that has left stops its attempt.
 */
export function usePairServer(
  onPaired: (server: KnownServer) => void,
): PairServer {
  const [state, setState] = useState<PairPhase>(scanning);
  const [held] = useState<Held>({ running: null, last: null });

  useEffect((): (() => void) => () => held.running?.abort(), [held]);

  return { state, ...actionsOf({ held, setState, onPaired }) };
}

const actionsOf = (hook: Hook): Omit<PairServer, 'state'> => ({
  read: (scanned, address) => readCode({ scanned, address }, hook),
  retry: (): void => {
    if (hook.held.last) readCode(hook.held.last, hook);
  },
  back: (): void => {
    hook.held.running?.abort();
    hook.held.running = null;
    hook.setState(scanning);
  },
});

function readCode(read: Read, hook: Hook): void {
  const invite = readPairingInvite(read.scanned);

  if (!invite || hook.held.running) return;

  hook.held.last = read;
  ask(invite, read, hook);
}

const depsOf = (read: Read, signal: AbortSignal): PairDeps => ({
  browse: browseServers,
  pair: pairWithServer,
  resolve: resolveServer,
  signal,
  address: read.address,
});

function ask(invite: PairingInvite, read: Read, hook: Hook): void {
  const controller = new AbortController();
  hook.held.running = controller;
  hook.setState({ phase: 'waiting', serverName: invite.server });

  void pairWithInvite(invite, depsOf(read, controller.signal)).then(
    (outcome) => {
      if (controller.signal.aborted) return;

      hook.held.running = null;
      settle(outcome, invite.server, hook);
    },
  );
}

function settle(outcome: PairOutcome, serverName: string, hook: Hook): void {
  if (outcome.kind === 'paired') hook.onPaired(outcome.server);
  else if (outcome.kind === 'failed') couldNotPair(hook);
  else hook.setState({ phase: 'failed', serverName, outcome });
}

// An error the owner cannot act on from a page of its own is a toast, and the scanner stays for another try.
function couldNotPair(hook: Hook): void {
  showToast({
    title: 'Could not pair',
    message: 'The other computer did not accept this Device.',
    tone: 'danger',
  });
  hook.setState(scanning);
}
