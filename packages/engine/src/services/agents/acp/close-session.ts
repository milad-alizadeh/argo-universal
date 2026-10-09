import { drainReservation, type AcpReservation } from './reservations';
import type { AcpResourceConnection } from './resource-connection';

const closeTimeoutMs = 5_000;
type CloseInput = {
  connection: AcpResourceConnection;
  reservation: AcpReservation;
  timeoutMs: number | undefined;
};
const closeAndDrain = async ({
  connection,
  reservation,
}: CloseInput): Promise<void> => {
  if (reservation.sessionId === undefined)
    throw new Error('ACP session identity is unresolved');
  await connection.closeSession(reservation.sessionId);
  await drainReservation(reservation);
};
export const closeProtocolReservation = async (
  input: CloseInput,
): Promise<void> => {
  const deadline = Promise.withResolvers<never>();
  const error = new Error('ACP session close timed out; cleanup retained');
  const timer = setTimeout(
    () => deadline.reject(error),
    input.timeoutMs ?? closeTimeoutMs,
  );
  try {
    await Promise.race([closeAndDrain(input), deadline.promise]);
  } finally {
    clearTimeout(timer);
  }
};
