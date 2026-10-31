import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useTRPC, type ServerMutation, type TRPC } from '#features/connection';
import type { PairingCodeLoad } from '../components/pair-device/pair-device-sheet';

// A code is replaced a little before its Ticket runs out, so the one on screen is still good when the owner finally gets their phone out.
const redrawMargin = 5_000;

export interface PairingCode {
  load: PairingCodeLoad;
  mint: () => void;
}

/*
 * The one code this sheet is showing. It exists because the owner asked for it: opening the sheet mints a Pairing Ticket, closing it revokes whatever is outstanding (ADR-0045).
 */
export function usePairingCode(open: boolean): PairingCode {
  const minting = useMintMutation();
  const expired = useExpiry(minting.data?.expiresAt);
  const revoke = useRevoke();

  // `mutate` keeps its identity across renders, so the effect below runs for the sheet opening and closing and for nothing else.
  const { mutate } = minting;

  useEffect((): void => {
    if (open) mutate();
    else revoke();
  }, [mutate, open, revoke]);

  return {
    load: codeLoad(minting, expired.expired),
    mint: minted(expired, mutate),
  };
}

const minted =
  (expired: Expiry, mutate: () => void): (() => void) =>
  (): void => {
    expired.reset();
    mutate();
  };

type Minting = ServerMutation<TRPC['pairing']['mint']>;

// What the Server has said so far, read from the one mutation rather than copied into state of its own.
function codeLoad(minting: Minting, expired: boolean): PairingCodeLoad {
  if (minting.isPending) return { status: 'minting' };

  if (expired) return { status: 'expired' };

  return answered(minting);
}

const answered = (minting: Minting): PairingCodeLoad =>
  minting.data
    ? { status: 'live', ...minting.data }
    : { status: minting.isError ? 'error' : 'minting' };

function useMintMutation(): Minting {
  const trpc = useTRPC();

  return useMutation(trpc.pairing.mint.mutationOptions());
}

interface Expiry {
  expired: boolean;
  reset: () => void;
}

// An expired code says so and offers a new one, so a scan that failed is not a mystery.
function useExpiry(expiresAt: string | undefined): Expiry {
  const [expired, setExpired] = useState(false);

  useEffect((): (() => void) | undefined => {
    if (expiresAt === undefined) return undefined;
    const due = Date.parse(expiresAt) - Date.now() - redrawMargin;
    const timer = setTimeout((): void => setExpired(true), Math.max(0, due));

    return (): void => clearTimeout(timer);
  }, [expiresAt]);

  return { expired, reset: useCallback((): void => setExpired(false), []) };
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
