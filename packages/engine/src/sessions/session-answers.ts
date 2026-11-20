import type {
  PendingPermission,
  PermissionOptionKind,
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
} from '@repo/contracts';
import {
  acceptedElicitationContent,
  validateElicitationAnswer,
  validatePermissionAnswer,
  waitingPermission,
} from './session-admission';
import { requireWritableSession, sendSessionCommand } from './session-command';
import type { SessionActorRef } from './session-machine';
import type { HandlerSources } from './session-sources';

type AnswerSources = HandlerSources<'readSession', 'admit' | 'session'>;

const findAnsweredSession = (
  sources: AnswerSources,
  sessionId: string,
): SessionActorRef | undefined => {
  sources.open.admit();
  requireWritableSession(sources.readSession(sessionId));

  return sources.open.session(sessionId);
};

export const answerSessionPermission = (
  sources: AnswerSources,
  input: SessionAnswerPermissionInput,
): SessionAnswerPermissionOutput => {
  const sessionActor = findAnsweredSession(sources, input.sessionId);
  validatePermissionAnswer(sessionActor, input);
  sendSessionCommand(sessionActor, {
    type: 'session.answerPermission',
    requestId: input.requestId,
    optionId: input.optionId,
  });

  return {};
};

// How a spoken answer landed: applied, too late because the request no longer waits, or not an option the Agent offered.
export type SpokenPermissionOutcome = 'answered' | 'settled' | 'not-offered';

type SpokenPermissionAnswer = {
  sessionId: string;
  requestId: string;
  kind: Extract<PermissionOptionKind, 'allow_once' | 'reject_once'>;
};

// The waiting request's option of the spoken kind, applied through the click's own procedure.
const answerWaiting = (
  sources: AnswerSources,
  request: PendingPermission,
  { sessionId, kind }: SpokenPermissionAnswer,
): SpokenPermissionOutcome => {
  const option = request.options.find((offered) => offered.kind === kind);

  if (!option) return 'not-offered';

  answerSessionPermission(sources, {
    sessionId,
    requestId: request.requestId,
    optionId: option.optionId,
  });

  return 'answered';
};

// A spoken answer (ADR-0064), for the request while it is the one waiting.
export const answerSessionPermissionBySpeech = (
  sources: AnswerSources,
  answer: SpokenPermissionAnswer,
): SpokenPermissionOutcome => {
  const { sessionId, requestId } = answer;
  const request = waitingPermission(sources.open.session(sessionId), requestId);

  return request ? answerWaiting(sources, request, answer) : 'settled';
};

export const answerSessionElicitation = (
  sources: AnswerSources,
  input: SessionAnswerElicitationInput,
): SessionAnswerElicitationOutput => {
  const sessionActor = findAnsweredSession(sources, input.sessionId);
  validateElicitationAnswer(sessionActor, input);
  sendSessionCommand(sessionActor, {
    type: 'session.answerElicitation',
    requestId: input.requestId,
    action: input.action,
    content: acceptedElicitationContent(sessionActor, input),
  });

  return {};
};
