import type { AcpOpenInput } from './resource-types';
import type { AcpRouting } from './routing';

export type AcpReservation = {
  input: AcpOpenInput;
  sessionId: string | undefined;
  withdrawn: boolean;
  dispatched: boolean;
  controller: AbortController;
  pending: Set<Promise<unknown>>;
  released: ReturnType<typeof Promise.withResolvers<void>>;
  closing: Promise<void> | undefined;
  stopWithdrawal: () => void;
};
const readKnownSessionId = (openingInput: AcpOpenInput): string | undefined =>
  openingInput.opening.method === 'session/new'
    ? undefined
    : openingInput.opening.params.sessionId;
export const reserveOpening = (input: AcpOpenInput): AcpReservation => ({
  input,
  sessionId: readKnownSessionId(input),
  withdrawn: input.signal?.aborted ?? false,
  dispatched: false,
  controller: new AbortController(),
  pending: new Set(),
  released: Promise.withResolvers<void>(),
  closing: undefined,
  stopWithdrawal: () => {},
});
export const drainReservation = async (
  reservation: AcpReservation,
): Promise<void> => {
  reservation.controller.abort();
  while (reservation.pending.size > 0) await Promise.all(reservation.pending);
};
export const settleReservationAfterExit = async (
  reservation: AcpReservation,
): Promise<void> => {
  reservation.controller.abort();
  await Promise.allSettled(reservation.pending);
};
export const trackReservationWork = <Result>(
  reservation: AcpReservation,
  work: Promise<Result>,
): Promise<Result> => {
  reservation.pending.add(work);
  void work.finally(() => reservation.pending.delete(work)).catch(() => {});
  return work;
};
export const releaseOpening = (
  reservation: AcpReservation,
  owners: Set<AcpReservation>,
  routing: AcpRouting,
): void => {
  reservation.stopWithdrawal();
  routing.release(reservation);
  owners.delete(reservation);
};
export const watchWithdrawal = (
  reservation: AcpReservation,
  withdraw: () => Promise<void>,
  failed: (error: unknown) => void,
): void => {
  const listener = (): void => {
    void withdraw().catch(failed);
  };
  reservation.input.signal?.addEventListener('abort', listener, { once: true });
  reservation.stopWithdrawal = (): void =>
    reservation.input.signal?.removeEventListener('abort', listener);
};
