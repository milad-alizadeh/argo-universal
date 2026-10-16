import {
  CreateElicitationRequest,
  type ClientRequestHandlersByMethod,
  type CreateElicitationResponse,
  type JsonRpcId,
} from '@agentclientprotocol/sdk';
import { createRejectionCounter } from '@repo/machine-log';
import type { LoginAgentCallbacks, LoginAgentRequest } from '../..';
import type { AcpLoginWire } from './login-wire';

type ElicitationHandler = ClientRequestHandlersByMethod['elicitation/create'];

type RequestUrl = LoginAgentRequest & { requestId: JsonRpcId };

type CancelAnswer = Extract<CreateElicitationResponse, { action: 'cancel' }>;

// Resolves with a cancel answer when the login is aborted, until stopped.
type CancelledAnswer = { promise: Promise<CancelAnswer>; stop: () => void };

type ProtocolUrlRequest = Extract<
  CreateElicitationRequest,
  { mode: 'url'; requestId: JsonRpcId }
>;

const rejections = createRejectionCounter('ACP login Elicitation');

const browserUrl = (url: string): boolean => {
  const parsed = URL.parse(url);

  if (!parsed) return false;

  return parsed.protocol === 'https:' || parsed.protocol === 'http:';
};

const requestUrl = (
  params: CreateElicitationRequest,
): params is ProtocolUrlRequest =>
  CreateElicitationRequest.isUrl(params) &&
  'requestId' in params &&
  browserUrl(params.url);

const readUrl = (
  params: Parameters<ElicitationHandler>[0]['params'],
): RequestUrl | undefined => {
  if (!requestUrl(params)) return undefined;

  return {
    id: params.elicitationId,
    url: params.url,
    message: params.message,
    requestId: params.requestId,
  };
};

const ownedRequest = (
  request: RequestUrl | undefined,
  wire: AcpLoginWire,
): request is RequestUrl =>
  request !== undefined && wire.matches(request.requestId);

const cancelled = (
  callbacks: LoginAgentCallbacks,
  signal: AbortSignal,
): boolean => signal.aborted || callbacks.signal.aborted;

const cancelledAnswer = (signal: AbortSignal): CancelledAnswer => {
  const answer = Promise.withResolvers<CancelAnswer>();
  const abort = (): void => answer.resolve({ action: 'cancel' });
  signal.addEventListener('abort', abort, { once: true });

  return {
    promise: answer.promise,
    stop: () => signal.removeEventListener('abort', abort),
  };
};

const answerUrl = (
  callbacks: LoginAgentCallbacks,
  request: LoginAgentRequest,
  signal: AbortSignal,
): Promise<{ action: 'accept' | 'decline' | 'cancel' }> => {
  const answer = cancelledAnswer(signal);

  return Promise.race([
    callbacks.createElicitation(request, signal),
    answer.promise,
  ]).finally(answer.stop);
};

const rejectRequest = (): CancelAnswer => {
  rejections.report(
    'Rejected unowned or unsupported login Elicitation',
    new Error('Login Elicitation does not match authenticate'),
  );

  return { action: 'cancel' };
};

export const loginElicitation =
  (wire: AcpLoginWire, callbacks: LoginAgentCallbacks): ElicitationHandler =>
  ({ params, signal }) => {
    const request = readUrl(params);

    if (!ownedRequest(request, wire)) return rejectRequest();

    if (cancelled(callbacks, signal)) return { action: 'cancel' };

    return answerUrl(
      callbacks,
      {
        id: request.id,
        url: request.url,
        message: request.message,
      },
      AbortSignal.any([signal, callbacks.signal]),
    );
  };
