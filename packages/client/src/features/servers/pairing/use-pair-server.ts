import {
  discoveryProtocol,
  discoveryServiceType,
  type PairingInvite,
  readPairingInvite,
} from '@repo/contracts';
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
import { type PairOutcome, pairWithInvite } from './pair-with-invite';
import { typeCode } from './type-code';
import { readTypedAddress } from './typed-address';

export interface PairServer {
  state: PairPhase;
  // A code the camera read, or the one the owner was shown; anything that is not an Argo code is ignored, and the answer says which it was so the scanner can show why nothing happened.
  read: (scanned: string, address?: ServerAddress) => boolean;
  // A code the owner typed, for a Device with no camera to read the QR; anything that is not a code says so and stays.
  type: (typed: string, host?: string) => void;
  // Tries the code just read once more, for a Server that was not on the network a moment ago; with the address the owner typed, it knocks there.
  retry: (host?: string) => void;
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
    browsed: false,
  });

  useEffect((): (() => void) => () => held.running?.abort(), [held]);

  return { state, ...actionsOf({ held, setState, onPaired }) };
}

const misconfiguredMessage = `This build cannot look for Servers: Info.plist needs _${discoveryServiceType}._${discoveryProtocol} under NSBonjourServices. Rebuild the app.`;

const actionsOf = (hook: Hook): Omit<PairServer, 'state'> => ({
  read: (scanned, address) => readCode({ scanned, address }, hook),
  type: (code, host): void => typeCode({ code, host }, hook),
  retry: (host): void => retryLast(host, hook),
  back: (): void => {
    hook.held.running?.abort();
    hook.held.running = null;
    hook.setState(scanning);
  },
});

// The same code once more: an address the owner typed replaces the one it was tried at, and a code typed in is asked again with it.
function retryLast(host: string | undefined, hook: Hook): void {
  const { last, lastTyped } = hook.held;

  if (lastTyped !== null)
    typeCode({ ...lastTyped, host: host || lastTyped.host }, hook);
  else if (last)
    void readCode({ ...last, address: readTypedAddress(host) ?? last.address }, hook);
}

function readCode(read: Read, hook: Hook): boolean {
  const invite = readPairingInvite(read.scanned);

  if (!invite) return false;

  if (hook.held.running) return true;

  hook.held.last = read;
  hook.held.lastTyped = null;
  ask(invite, read, hook);

  return true;
}

function ask(invite: PairingInvite, read: Read, hook: Hook): void {
  const controller = new AbortController();
  hook.held.running = controller;
  // The owner is asked only once the request reaches the Server; until then the App is still finding it.
  hook.setState({ phase: 'looking', serverName: invite.server });

  const deps = {
    ...depsOf(controller.signal, hook.held, read.address),
    onReached: (): void => waitOn(invite, controller, hook),
    onUnreached: (): void => lookAgain(invite, controller, hook),
  };

  void pairWithInvite(invite, deps).then((outcome) => {
    if (!controller.signal.aborted) end(outcome, invite, hook);
  });
}

function waitOn(
  invite: PairingInvite,
  controller: AbortController,
  hook: Hook,
): void {
  if (!controller.signal.aborted)
    hook.setState({ phase: 'waiting', serverName: invite.server });
}

function lookAgain(
  invite: PairingInvite,
  controller: AbortController,
  hook: Hook,
): void {
  if (!controller.signal.aborted)
    hook.setState({ phase: 'looking', serverName: invite.server });
}

function end(outcome: PairOutcome, invite: PairingInvite, hook: Hook): void {
  hook.held.running = null;

  if (outcome.kind === 'misconfigured') console.error(misconfiguredMessage);
  settle(outcome, hook, { serverName: invite.server });
}
