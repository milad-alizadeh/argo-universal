import type {
  InitialConfigOption,
  SessionConfigOption,
  SessionNewInput,
  SessionNewOutput,
  SessionPromptOutput,
} from '@repo/contracts';
import { recordedSessionOptions } from '@repo/mocks/app';
import { type Mock, vi } from 'vitest';
import { EmptySessionStore } from '../../src/features/sessions/stores/empty-session-store';
import type { EmptySessionPorts } from '../../src/features/sessions/stores/empty-session-types';
import { openFailure } from './open-failure.mocks';

// Written out so the store cannot grade itself.
export const choiceDebounceMs = 300;

export const local = (agent: string): SessionNewInput => ({
  projectId: 'project-a',
  agent,
  checkout: { type: 'main' },
  configOptions: [],
  prompt: [],
});

export const worktree: SessionNewInput = {
  ...local('agent-one'),
  checkout: { type: 'worktree', baseBranch: 'main' },
};

export const prompt = [
  { type: 'text' as const, text: 'Fix the flaky login test' },
];

export const options: SessionConfigOption[] =
  recordedSessionOptions('agent-one');

export const launchFailureMessage = 'The Agent did not start';

// A rejected `session.new` whose Agent failed to launch.
export const failure = openFailure({
  type: 'failed',
  message: launchFailureMessage,
});

// A rejected `session.new` whose Agent needs sign-in.
export const authRequired = openFailure({ type: 'auth-required' });

export const promptOutput: SessionPromptOutput = { messageId: 'message-1' };

// Each open and prompt waits until the test settles it.
export interface Calls {
  open: {
    input: SessionNewInput;
    call: PromiseWithResolvers<SessionNewOutput>;
  }[];
  close: string[];
  setConfigOption: InitialConfigOption[];
  prompt: {
    input: string;
    call: PromiseWithResolvers<SessionPromptOutput>;
  }[];
  handOff: string[];
  clearDraft: number;
}

// A call the test settles, recorded as it is made.
function deferred<Input, Output>(
  record: { input: Input; call: PromiseWithResolvers<Output> }[],
  input: Input,
): Promise<Output> {
  const call = Promise.withResolvers<Output>();
  record.push({ input, call });

  return call.promise;
}

// A call answered at once, recorded as it is made.
function answered<Input, Output>(
  record: Input[],
  input: Input,
  output: Output,
): Promise<Output> {
  record.push(input);

  return Promise.resolve(output);
}

const fakePorts = (calls: Calls): EmptySessionPorts => ({
  open: (input) => deferred(calls.open, input),
  close: (sessionId) => answered(calls.close, sessionId, {}),
  setConfigOption: (_sessionId, change) =>
    answered(calls.setConfigOption, change, options),
  prompt: (sessionId) => deferred(calls.prompt, sessionId),
  handOff: (sessionId) => void calls.handOff.push(sessionId),
  clearDraft: () => {
    calls.clearDraft += 1;
  },
});

export const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};

export interface EmptySessionHarness {
  calls: Calls;
  store: EmptySessionStore;
  choose: (input?: SessionNewInput) => void;
  // The Local Session opens and its Feed reads its options.
  openLocal: (sessionId: string) => Promise<void>;
  // The screen's send of the Composer's current draft, which Retry asks for on a New worktree.
  sendDraft: Mock<() => void>;
  // Retry, or a finished sign-in.
  retry: () => void;
  // The Connection reopens.
  reconnect: () => void;
}

const noCalls = (): Calls => ({
  open: [],
  close: [],
  setConfigOption: [],
  prompt: [],
  handOff: [],
  clearDraft: 0,
});

// The latest Local Session opens and its Feed reads its options, with no saved choices or picks.
async function openLocal(
  calls: Calls,
  store: EmptySessionStore,
  sessionId: string,
): Promise<void> {
  calls.open.at(-1)?.call.resolve({ sessionId });
  await settle();
  store.configure(
    { saved: {}, picks: {}, initial: [] },
    { sessionId, configOptions: options },
  );
  await settle();
}

// Retry with a spy for the screen's draft send, and the Connection reopening.
function openAgainCauses(
  store: EmptySessionStore,
): Pick<EmptySessionHarness, 'sendDraft' | 'retry' | 'reconnect'> {
  const sendDraft = vi.fn<() => void>();

  return {
    sendDraft,
    retry: () => store.openAgain({ by: 'user', sendDraft }),
    reconnect: () => store.openAgain({ by: 'connection' }),
  };
}

// A started store over fake Server calls the test settles one by one.
export function emptySessionHarness(): EmptySessionHarness {
  const calls = noCalls();
  const ports = fakePorts(calls);
  const store = new EmptySessionStore(ports);
  store.start();

  return {
    calls,
    store,
    choose: (input) => store.choose({ input, connected: true }),
    openLocal: (sessionId) => openLocal(calls, store, sessionId),
    ...openAgainCauses(store),
  };
}
