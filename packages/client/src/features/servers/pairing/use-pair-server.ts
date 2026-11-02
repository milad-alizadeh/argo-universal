import { type PairingInvite, readPairingInvite } from '@repo/contracts';
import { useEffect, useState } from 'react';
import type { KnownServer, ServerAddress } from '#features/connection';
import {
  depsOf,
  type Held,
  type Hook,
  type PairPhase,
  type Read,
  scanning,
  settle,
} from './pair-hook';
import { pairWithInvite } from './pair-with-invite';
import { typeCode } from './type-code';

export interface PairServer {
  state: PairPhase;
  // A code the camera read, or the one the owner was shown; anything that is not an Argo code is ignored.
  read: (scanned: string, address?: ServerAddress) => void;
  // A code the owner typed, for a Device with no camera to read the QR; anything that is not a code says so and stays.
  type: (typed: string) => void;
  // Tries the code just read once more, for a Server that was not on the network a moment ago.
  retry: () => void;
  // Stops waiting and goes back to reading a code.
  back: () => void;
}

/*
 * The App's side of Add a Server (ADR-0045). The wait is the Connection itself: the Server holds the Device until the owner answers, so there is no polling and no timer here, and a page that has left stops its attempt.
 */
export function usePairServer(
  onPaired: (server: KnownServer) => void,
): PairServer {
  const [state, setState] = useState<PairPhase>(scanning);

  const [held] = useState<Held>({
    running: null,
    last: null,
    lastTyped: null,
  });

  useEffect((): (() => void) => () => held.running?.abort(), [held]);

  return { state, ...actionsOf({ held, setState, onPaired }) };
}

const actionsOf = (hook: Hook): Omit<PairServer, 'state'> => ({
  read: (scanned, address) => readCode({ scanned, address }, hook),
  type: (typed): void => typeCode(typed, hook),
  retry: (): void => {
    if (hook.held.lastTyped !== null) typeCode(hook.held.lastTyped, hook);
    else if (hook.held.last) readCode(hook.held.last, hook);
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
  hook.held.lastTyped = null;
  ask(invite, read, hook);
}

function ask(invite: PairingInvite, read: Read, hook: Hook): void {
  const controller = new AbortController();
  hook.held.running = controller;
  hook.setState({ phase: 'waiting', serverName: invite.server });

  void pairWithInvite(invite, depsOf(controller.signal, read.address)).then(
    (outcome) => {
      if (controller.signal.aborted) return;

      hook.held.running = null;
      settle(outcome, hook, { serverName: invite.server });
    },
  );
}
