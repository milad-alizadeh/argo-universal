import {
  releaseOpening,
  reserveOpening,
  watchWithdrawal,
  type AcpReservation,
} from './reservations';
import type { AcpResourceCleanup } from './resource-cleanup';
import type { AcpOpenInput, AcpSessionLease } from './resource-types';
import type { AcpRouting } from './routing';

type ProtocolSession = Omit<AcpSessionLease, 'close' | 'replace' | 'released'>;
type LeaseHandover = {
  opened: ProtocolSession;
  reservation: AcpReservation;
  cleanup: AcpResourceCleanup;
} & Pick<AcpSessionLease, 'close' | 'replace'>;
const requireHandover = async (input: LeaseHandover): Promise<void> => {
  if (!input.reservation.withdrawn) return;
  await input.close();
  throw new DOMException('ACP opening was withdrawn', 'AbortError');
};
export const handoverOwnedLease = async (
  input: LeaseHandover,
): Promise<AcpSessionLease> => {
  input.reservation.stopWithdrawal();
  if (input.cleanup.retired) input.reservation.withdrawn = true;
  await requireHandover(input);
  return {
    ...input.opened,
    close: input.close,
    replace: input.replace,
    released: input.reservation.released.promise,
  };
};

type Ownership = {
  reservations: Set<AcpReservation>;
  routing: AcpRouting;
  cleanup: AcpResourceCleanup;
};
type ReplacementOwner = Ownership & {
  close: (reservation: AcpReservation) => Promise<void>;
  open: (reservation: AcpReservation) => Promise<AcpSessionLease>;
};
type Replacement = ReplacementOwner & {
  previous: AcpReservation;
  successor: AcpReservation;
};
const abandonSuccessor = (
  input: Replacement,
  error: unknown,
): Promise<void> => {
  input.successor.withdrawn = true;
  if (input.successor.dispatched)
    return input.cleanup.abandon(input.successor, error);
  releaseOpening(input.successor, input.reservations, input.routing);
  input.successor.released.resolve();
  void input.cleanup
    .releaseIfIdle()
    .catch((failure: unknown) => input.cleanup.retire(input.previous, failure));
  return Promise.resolve();
};
export const replaceOwnedLease = async (
  input: Replacement,
): Promise<AcpSessionLease> => {
  try {
    await input.close(input.previous);
    input.routing.reserve(input.successor);
    return await input.open(input.successor);
  } catch (error) {
    await abandonSuccessor(input, error);
    throw error;
  }
};
const requireReplaceableLease = (
  reservations: Set<AcpReservation>,
  previous: AcpReservation,
): void => {
  if (!reservations.has(previous) || previous.closing)
    throw new Error('ACP Session is no longer available for replacement');
};
export const prepareLeaseReplacement = (
  previous: AcpReservation,
  input: Omit<AcpOpenInput, 'launch'>,
  owner: ReplacementOwner,
): Promise<AcpSessionLease> => {
  if (owner.cleanup.retired) throw new Error('ACP resource is unavailable');
  requireReplaceableLease(owner.reservations, previous);
  // Keep one owner through close and drain, including for the last Session.
  const successor = reserveOwnedOpening(
    { ...input, launch: previous.input.launch },
    owner,
    false,
  );
  return replaceOwnedLease({ ...owner, previous, successor });
};
const withdraw = async (
  reservation: AcpReservation,
  owner: Ownership,
): Promise<void> => {
  reservation.withdrawn = true;
  await owner.cleanup.releaseIfIdle();
};
export const reserveOwnedOpening = (
  input: AcpOpenInput,
  owner: Ownership,
  bind = true,
): AcpReservation => {
  const reservation = reserveOpening(input);
  if (bind) owner.routing.reserve(reservation);
  owner.reservations.add(reservation);
  watchWithdrawal(
    reservation,
    () => withdraw(reservation, owner),
    (error) => owner.cleanup.retire(reservation, error),
  );
  return reservation;
};
export const awaitCheckoutRelease = async (
  reservation: AcpReservation,
  confirm: () => Promise<void>,
): Promise<void> => {
  await confirm().catch((error: unknown) => {
    reservation.withdrawn = true;
    throw error;
  });
};
