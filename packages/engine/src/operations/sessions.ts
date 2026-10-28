import type {
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
} from '@repo/contracts';
import type { sessionOperations } from '@repo/contracts/operations';
import {
  archiveSession,
  cancelSession,
  startSessionCreation,
  startSessionPrompt,
  stopShell,
  unarchiveSession,
  closeSession,
  configureSession,
  renameSession,
  saveSessionPlan,
  type AcceptedSessionPrompt,
  type SessionRouterDeps,
} from '../sessions';
import {
  startedWork,
  type AcceptedWork,
  type NativeStartRequest,
  type StartedWork,
} from './native-start';
import type { OperationImplementations } from './operations';

export const sessionImplementations = (
  deps: SessionRouterDeps,
): Pick<OperationImplementations, keyof typeof sessionOperations> => ({
  'session.new': (input, request) => startCreation(deps, input, request),
  'session.prompt': async (input, request) => startPrompt(deps, input, request),
  'session.cancel': async (input) => cancelSession(deps, input.sessionId),
  'session.archive': (input) => archiveSession(deps, input.sessionId),
  'session.unarchive': (input) => unarchiveSession(deps, input.sessionId),
  'session.savePlan': saveSessionPlan.bind(null, deps),
  'session.close': (params) => closeSession(deps, params.sessionId),
  'session.setConfigOption': configureSession.bind(null, deps),
  'shell.stop': async (params) => stopShell(deps, params),
  'session.rename': renameSession.bind(null, deps),
});

async function startCreation(
  deps: SessionRouterDeps,
  input: SessionNewInput,
  request: NativeStartRequest,
): Promise<StartedWork<SessionNewOutput>> {
  const creation = await startSessionCreation(
    admissionDeps(deps, request.signal),
    input,
    request,
  );

  return startedWork('creation', creation, ({ sessionId, turnId }) => ({
    result: { sessionId },
    turnId,
  }));
}

function startPrompt(
  deps: SessionRouterDeps,
  input: SessionPromptInput,
  request: NativeStartRequest,
): StartedWork<SessionPromptOutput> {
  const prompt = startSessionPrompt(
    admissionDeps(deps, request.signal),
    input,
    request,
  );

  return startedWork('turn', prompt, acceptedPrompt);
}

function acceptedPrompt(
  accepted: AcceptedSessionPrompt,
): AcceptedWork<SessionPromptOutput> {
  if (accepted.messageId === null) return { result: accepted };

  return {
    result: { messageId: accepted.messageId },
    turnId: accepted.turnId,
  };
}

// A user caller's ninety-second budget also stops the Session command it is waiting to admit.
function admissionDeps(
  deps: SessionRouterDeps,
  signal: AbortSignal | undefined,
): SessionRouterDeps {
  if (!signal) return deps;

  const sessionCommandSignal = deps.sessionCommandSignal
    ? AbortSignal.any([deps.sessionCommandSignal, signal])
    : signal;

  return { ...deps, sessionCommandSignal };
}
