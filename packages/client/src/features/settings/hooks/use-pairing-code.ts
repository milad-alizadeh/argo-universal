import type { MintedPairingTicket } from '@repo/contracts';
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { useTRPC, type ServerMutation, type TRPC } from '#features/connection';
import type { PairingCodeLoad } from '../components/pair-device/pair-device-sheet';
import { renewsAt } from '../components/pair-device/pairing-renewal';

/*
 * The shortest a code is ever left on screen. The Server and this computer read one clock, so a fresh code
 * always has most of two minutes to run; this only stops a clock that disagrees from minting codes back to back.
 */
const shortestShown = 10_000;

export interface PairingCode {
  load: PairingCodeLoad;
  mint: () => void;
}

/*
 * The one code this sheet is showing. It exists because the owner asked for it: opening the sheet mints a Pairing Ticket, and closing it revokes whatever is outstanding (ADR-0045).
 * While the sheet is open the code renews itself a little before its Ticket runs out, as a 2FA code does, so the owner never meets one that has expired (#2353).
 */
export function usePairingCode(open: boolean): PairingCode {
  const minting = useMintMutation();
  const [shown, setShown] = useState<MintedPairingTicket>();
  const mint = useMint(minting, setShown);
  const { reset } = minting;

  useOpening(open, mint, (): void => {
    // Reset first, so a code still on its way when the sheet closed is never put on screen.
    reset();
    setShown(undefined);
  });
  useRenewal(shown?.expiresAt, mint);

  return { load: codeLoad(minting, shown), mint };
}

/*
 * The sheet opening mints its first code, and closing it takes the code down. Every Ticket is revoked
 * whenever the sheet is shut, including when the App starts, so none outlives the owner's attention.
 * `mint` and `revoke` keep their identity across renders, so this runs for the sheet opening and closing and for nothing else.
 */
function useOpening(open: boolean, mint: () => void, close: () => void): void {
  const revoke = useRevoke();
  const closed = useEffectEvent(close);

  useEffect((): (() => void) | undefined => {
    if (!open) {
      revoke();

      return undefined;
    }

    mint();

    return (): void => closed();
  }, [mint, open, revoke]);
}

type Minting = ServerMutation<TRPC['pairing']['mint']>;

/*
 * Asks the Server for a code and puts it on screen once it arrives. The code it replaces stays up until
 * then, since it is still good for the margin it was renewed by; a mint that fails takes it down.
 */
function useMint(
  minting: Minting,
  setShown: (code: MintedPairingTicket | undefined) => void,
): () => void {
  const { mutate } = minting;

  return useCallback((): void => {
    mutate(undefined, {
      onSuccess: (code): void => setShown(code),
      onError: (): void => setShown(undefined),
    });
  }, [mutate, setShown]);
}

// What the sheet draws: the code on screen, else why there is none yet.
function codeLoad(
  minting: Minting,
  shown: MintedPairingTicket | undefined,
): PairingCodeLoad {
  if (minting.isError) return { status: 'error' };

  return shown ? { status: 'live', ...shown } : { status: 'minting' };
}

function useMintMutation(): Minting {
  const trpc = useTRPC();

  return useMutation(trpc.pairing.mint.mutationOptions());
}

// Mints the next code when the one on screen is due to be replaced.
function useRenewal(expiresAt: string | undefined, mint: () => void): void {
  useEffect((): (() => void) | undefined => {
    if (expiresAt === undefined) return undefined;
    const due = Math.max(shortestShown, renewsAt(expiresAt) - Date.now());
    const timer = setTimeout(mint, due);

    return (): void => clearTimeout(timer);
  }, [expiresAt, mint]);
}

// The sheet closing: the code it put on screen stops working at once rather than outliving the owner's attention by up to two minutes.
function useRevoke(): () => void {
  const trpc = useTRPC();
  const refreshed = useRefreshedDevices();

  const { mutate } = useMutation(trpc.pairing.revoke.mutationOptions());

  return useCallback((): void => {
    mutate();
    refreshed();
  }, [mutate, refreshed]);
}

// The Devices list changes whenever a Device registers or stops being paired, and it is read on another page.
export function useRefreshedDevices(): () => void {
  const cache = useQueryClient();
  const key: QueryKey = useTRPC().devices.list.queryKey();

  return useCallback((): void => {
    void cache.invalidateQueries({ queryKey: key });
  }, [cache, key]);
}
