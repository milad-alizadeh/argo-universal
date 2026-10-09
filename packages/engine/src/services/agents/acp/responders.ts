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
type SessionQuestionResponderFactory<Handler> = (
  findSessionReservation: (
    sessionId: string | undefined,
  ) => AcpReservation | undefined,
  responseWrites: AcpResponseWrites,
) => Handler;
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
const waitForCancelledResponse = <Value>(
  signal: AbortSignal,
  cancelledResponse: Value,
): Promise<Value> =>
  new Promise((resolve) => {
    if (signal.aborted) resolve(cancelledResponse);
    else
      signal.addEventListener('abort', () => resolve(cancelledResponse), {
        once: true,
      });
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
  input.writes.retainRequestResponseWrite(reservation, input.requestId);
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
    waitForCancelledResponse(signal, input.fallback),
  ]);
  return trackReservationWork(reservation, response);
};
export const createPermissionResponder: SessionQuestionResponderFactory<
  PermissionHandler
> = (findSessionReservation, responseWrites) => (context) =>
  respond({
    reservation: findSessionReservation(context.params.sessionId),
    signal: context.signal,
    fallback: { outcome: { outcome: 'cancelled' } },
    requestId: context.requestId,
    writes: responseWrites,
    invoke: (reservation, signal) =>
      reservation.input.destination.requestPermission({ ...context, signal }),
  });
const readElicitationSessionId = (
  request: Parameters<ElicitationHandler>[0]['params'],
): string | undefined => {
  if ('sessionId' in request && typeof request.sessionId === 'string')
    return request.sessionId;
  return undefined;
};
export const createElicitationResponder: SessionQuestionResponderFactory<
  ElicitationHandler
> = (findSessionReservation, responseWrites) => (context) =>
  respond({
    reservation: findSessionReservation(
      readElicitationSessionId(context.params),
    ),
    signal: context.signal,
    fallback: { action: 'cancel' },
    requestId: context.requestId,
    writes: responseWrites,
    invoke: (reservation, signal) =>
      reservation.input.destination.createElicitation({ ...context, signal }),
  });
