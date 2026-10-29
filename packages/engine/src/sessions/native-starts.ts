import type { SessionNewInput, SessionPromptInput } from '@repo/contracts';
import { startSessionCreation } from './creation/session-creation';
import type { SessionOrigin } from './prompt-sender';
import type { SessionRouterDeps } from './router-deps';
import { startSessionPrompt } from './session-prompt';

// A caller's origin, with a new Session's pre-allocated id and the signal that stops its admission.
export type NativeStartRequest = SessionOrigin & {
  sessionId?: string;
  signal?: AbortSignal;
};

// The two ways Operations start native Session work: a new Session, or a Prompt's Turn.
export type NativeStarts = {
  create: (
    input: SessionNewInput,
    request: NativeStartRequest,
  ) => ReturnType<typeof startSessionCreation>;
  prompt: (
    input: SessionPromptInput,
    request: NativeStartRequest,
  ) => ReturnType<typeof startSessionPrompt>;
};

export function createNativeStarts(deps: SessionRouterDeps): NativeStarts {
  return {
    create: (input, request) =>
      startSessionCreation(admissionDeps(deps, request.signal), input, request),
    prompt: (input, request) =>
      startSessionPrompt(admissionDeps(deps, request.signal), input, request),
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
