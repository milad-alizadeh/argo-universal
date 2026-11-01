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
  onAllow: asking.allow,
  onOpenChange: (next): void => {
    setOpen(next);
    asking.answered();
  },
  onDecline: asking.decline,
});

interface Asking {
  registration: PairingRegistration | undefined;
  answered: () => void;
  allow: (registration: PairingRegistration) => void;
  decline: (registration: PairingRegistration) => void;
}

// The Device that turned up while this sheet has been open, and what the owner answers about it.
function useRegistrations(open: boolean): Asking {
  const [registration, setRegistration] = useState<PairingRegistration>();

  useRegistered(open, setRegistration);

  const answered = useCallback((): void => setRegistration(undefined), []);

  return {
    registration,
    answered,
    allow: useAnswer('allow', answered),
    decline: useAnswer('decline', answered),
  };
}

function useRegistered(
  open: boolean,
  setRegistration: (registration: PairingRegistration) => void,
): void {
  const trpc = useTRPC();
  const watching = open ? undefined : skipToken;

  useResubscribeOnReconnect(
    useSubscription(
      trpc.pairing.registered.subscriptionOptions(watching, {
        onData: setRegistration,
      }),
    ),
  );
}

// Allow is what writes the Device down and lets it in, and Don't allow is what it never is: either way the Devices list may have changed.
function useAnswer(
  answer: 'allow' | 'decline',
  answered: () => void,
): (registration: PairingRegistration) => void {
  const trpc = useTRPC();
  const refreshed = useRefreshedDevices();

  const options = trpc.pairing[answer].mutationOptions({
    onSuccess: refreshed,
  });

  const { mutate } = useMutation(options);

  return (registration): void => {
    answered();
    mutate({ deviceId: registration.deviceId });
  };
}
