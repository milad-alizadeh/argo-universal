import type {
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
} from '@repo/contracts';
import type { OpenSessions } from './open-sessions';
import {
  acceptedElicitationContent,
  validateElicitationAnswer,
  validatePermissionAnswer,
} from './session-admission';
import { requireWritableSession, sendSessionCommand } from './session-command';
import type { SessionActorRef } from './session-machine';

const findAnsweredSession = (
  open: OpenSessions,
  sessionId: string,
): SessionActorRef | undefined => {
  open.admit();
  requireWritableSession(open.readSession(sessionId));

  return open.session(sessionId);
};

export const answerSessionPermission = (
  open: OpenSessions,
  input: SessionAnswerPermissionInput,
): SessionAnswerPermissionOutput => {
  const sessionActor = findAnsweredSession(open, input.sessionId);
  validatePermissionAnswer(sessionActor, input);
  sendSessionCommand(sessionActor, {
    type: 'session.answerPermission',
    requestId: input.requestId,
    optionId: input.optionId,
  });

  return {};
};

export const answerSessionElicitation = (
  open: OpenSessions,
  input: SessionAnswerElicitationInput,
): SessionAnswerElicitationOutput => {
  const sessionActor = findAnsweredSession(open, input.sessionId);
  validateElicitationAnswer(sessionActor, input);
  sendSessionCommand(sessionActor, {
    type: 'session.answerElicitation',
    requestId: input.requestId,
    action: input.action,
    content: acceptedElicitationContent(sessionActor, input),
  });

  return {};
};
