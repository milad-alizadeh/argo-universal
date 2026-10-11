import type {
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
} from '@repo/contracts';
import { findMachineActor } from '../../lib/machine-actor';
import type { SessionRouterDeps } from './router-deps';
import {
  validateElicitationAnswer,
  validatePermissionAnswer,
} from './session-admission';
import {
  sendSessionCommand,
  validateSessionCommandAdmission,
} from './session-command';
import { type SessionActorRef, sessionMachine } from './session-machine';
import { sessionActorId } from './session-system';

type AnswerDeps = Pick<SessionRouterDeps, 'sessions' | 'sessionCommandSignal'>;

const findAnsweredSession = (
  deps: AnswerDeps,
  sessionId: string,
): SessionActorRef | undefined => {
  validateSessionCommandAdmission(deps);
  return findMachineActor(
    deps.sessions.system,
    sessionActorId(sessionId),
    sessionMachine,
  );
};

export const answerSessionPermission = (
  deps: AnswerDeps,
  input: SessionAnswerPermissionInput,
): SessionAnswerPermissionOutput => {
  const sessionActor = findAnsweredSession(deps, input.sessionId);
  validatePermissionAnswer(sessionActor, input);
  sendSessionCommand(sessionActor, {
    type: 'session.answerPermission',
    requestId: input.requestId,
    optionId: input.optionId,
    message: input.message,
  });
  return {};
};

export const answerSessionElicitation = (
  deps: AnswerDeps,
  input: SessionAnswerElicitationInput,
): SessionAnswerElicitationOutput => {
  const sessionActor = findAnsweredSession(deps, input.sessionId);
  validateElicitationAnswer(sessionActor, input);
  sendSessionCommand(sessionActor, {
    type: 'session.answerElicitation',
    requestId: input.requestId,
    action: input.action,
    content: input.content,
  });
  return {};
};
