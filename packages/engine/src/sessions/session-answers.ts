import type {
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
} from '@repo/contracts';
import {
  acceptedElicitationContent,
  validateElicitationAnswer,
  validatePermissionAnswer,
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
