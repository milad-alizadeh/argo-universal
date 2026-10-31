import type { PairingRegistration } from '@repo/contracts';
import { skipToken, useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useState } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import type { PairDeviceSheetProps } from '../components/pair-device/pair-device-sheet';
import { useRefreshedDevices, usePairingCode } from './use-pairing-code';

export type PairDeviceControls = PairDeviceSheetProps & {
  onOpen: () => void;
};

/*
 * Everything the pair sheet is: the code it shows while it is open, and the owner's answer for the Device that turns up with it (ADR-0045).
 * The sheet is where the owner answers, because it is where they are already present and watching the code they asked for.
 */
export function usePairDevice(): PairDeviceControls {
  const [open, setOpen] = useState(false);
  const asking = useRegistrations(open);
  const code = usePairingCode(open);

  return {
    open,
    code: code.load,
    asking: asking.registration,
    onNewCode: code.mint,
    onOpen: (): void => setOpen(true),
    ...answering(asking, setOpen),
  };
}

type Answering = Pick<
  PairDeviceControls,
  'onOpenChange' | 'onAllow' | 'onDecline'
>;

// Every way the owner finishes with the Device that asked: allowing it, declining it, or closing the sheet on it.
const answering = (
  asking: Asking,
  setOpen: (open: boolean) => void,
): Answering => ({
  onAllow: asking.answered,
  onOpenChange: (next): void => {
    setOpen(next);
    asking.answered();
  },
  onDecline: (registration): void => {
    asking.answered();
    asking.decline(registration);
  },
});

interface Asking {
  registration: PairingRegistration | undefined;
  answered: () => void;
  decline: (registration: PairingRegistration) => void;
}

// The Device that turned up while this sheet has been open, and what the owner answers about it.
function useRegistrations(open: boolean): Asking {
  const [registration, setRegistration] = useState<PairingRegistration>();

  useRegistered(open, setRegistration);

  return {
    registration,
    answered: useCallback((): void => setRegistration(undefined), []),
    decline: useDecline(),
  };
}

function useRegistered(
  open: boolean,
  setRegistration: (registration: PairingRegistration) => void,
): void {
  const trpc = useTRPC();
  const watching = open ? undefined : skipToken;
  const onData = useRegistration(setRegistration);

  useResubscribeOnReconnect(
    useSubscription(
      trpc.pairing.registered.subscriptionOptions(watching, { onData }),
    ),
  );
}

// A Device that registered is a Device the Server has written down, so the Devices list has something new to say.
function useRegistration(
  setRegistration: (registration: PairingRegistration) => void,
): (next: PairingRegistration) => void {
  const refreshed = useRefreshedDevices();

  return (next: PairingRegistration): void => {
    setRegistration(next);
    refreshed();
  };
}

// Declining deletes the Device's row, so it reaches nothing on its next connect and has no Ticket left to pair with again.
function useDecline(): (registration: PairingRegistration) => void {
  const trpc = useTRPC();
  const refreshed = useRefreshedDevices();

  const { mutate } = useMutation(
    trpc.pairing.decline.mutationOptions({ onSuccess: refreshed }),
  );

  return useCallback(
    (registration): void => mutate({ deviceId: registration.deviceId }),
    [mutate],
  );
}
