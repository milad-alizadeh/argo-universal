import type {
  ClientRequestHandlersByMethod,
  JsonRpcId,
} from '@agentclientprotocol/sdk';
import { trackReservationWork, type AcpReservation } from './reservations';
import type { AcpResponseWrites } from './response-writes';

const pendingRequestLimit = 32;
type PermissionHandler =
  ClientRequestHandlersByMethod['session/request_permission'];
type ElicitationHandler = ClientRequestHandlersByMethod['elicitation/create'];
type RespondInput<Response> = {
  reservation: AcpReservation | undefined;
  signal: AbortSignal;
  fallback: Response;
  requestId: JsonRpcId;
  writes: AcpResponseWrites;
  invoke: (
    reservation: AcpReservation,
    signal: AbortSignal,
  ) => Response | Promise<Response>;
};
const cancelled = <Value>(signal: AbortSignal, value: Value): Promise<Value> =>
  new Promise((resolve) => {
    if (signal.aborted) resolve(value);
    else signal.addEventListener('abort', () => resolve(value), { once: true });
  });
const respond = <Response>(
  input: RespondInput<Response>,
): Promise<Response> => {
  const { reservation } = input;
  if (!reservation) return Promise.resolve(input.fallback);
  return respondOwned(reservation, input);
};
const respondOwned = <Response>(
  reservation: AcpReservation,
  input: RespondInput<Response>,
): Promise<Response> => {
  input.writes.retain(reservation, input.requestId);
  if (reservation.pending.size > pendingRequestLimit)
    input.writes.reject(new Error('ACP pending request limit reached'));
  return reservation.withdrawn
    ? Promise.resolve(input.fallback)
    : startResponse(reservation, input);
};
const startResponse = <Response>(
  reservation: AcpReservation,
  input: RespondInput<Response>,
): Promise<Response> => {
  const signal = AbortSignal.any([input.signal, reservation.controller.signal]);
  const response = Promise.race([
    Promise.resolve(input.invoke(reservation, signal)),
    cancelled(signal, input.fallback),
  ]);
  return trackReservationWork(reservation, response);
};
export const permissionResponder =
  (
    find: (id: string | undefined) => AcpReservation | undefined,
    writes: AcpResponseWrites,
  ): PermissionHandler =>
  (context) =>
    respond({
      reservation: find(context.params.sessionId),
      signal: context.signal,
      fallback: { outcome: { outcome: 'cancelled' } },
      requestId: context.requestId,
      writes,
      invoke: (reservation, signal) =>
        reservation.input.destination.requestPermission({ ...context, signal }),
    });
const elicitationSessionId = (
  params: Parameters<ElicitationHandler>[0]['params'],
): string | undefined => {
  if ('sessionId' in params && typeof params.sessionId === 'string')
    return params.sessionId;
  return undefined;
};
export const elicitationResponder =
  (
    find: (id: string | undefined) => AcpReservation | undefined,
    writes: AcpResponseWrites,
  ): ElicitationHandler =>
  (context) =>
    respond({
      reservation: find(elicitationSessionId(context.params)),
      signal: context.signal,
      fallback: { action: 'cancel' },
      requestId: context.requestId,
      writes,
      invoke: (reservation, signal) =>
        reservation.input.destination.createElicitation({ ...context, signal }),
    });
