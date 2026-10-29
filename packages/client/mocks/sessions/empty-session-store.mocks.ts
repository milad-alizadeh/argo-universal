import type { SessionNewInput, SessionNewOutput } from '@repo/contracts';
import { type Mock, vi } from 'vitest';
import type { ConnectionState } from '../../src/features/connection';
import { EmptySessionStore } from '../../src/features/sessions/stores/empty-session-store';
import type { EmptySessionPorts } from '../../src/features/sessions/stores/empty-session-types';
import { openFailure } from './open-failure.mocks';

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

const launchFailureMessage = 'The Agent did not start';

// A rejected `session.new` whose Agent failed to launch.
export const failure = openFailure({
  type: 'failed',
  message: launchFailureMessage,
});

// A rejected `session.new` whose Agent needs sign-in.
export const authRequired = openFailure({ type: 'auth-required' });

// Each open and prompt waits until the test settles it.
interface Calls {
  open: {
    input: SessionNewInput;
    call: PromiseWithResolvers<SessionNewOutput>;
  }[];
  handOff: string[];
  clearDraft: number;
  // The Connection's state, which the test drops and reopens.
  connection: ConnectionState;
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

const fakePorts = (calls: Calls): EmptySessionPorts => ({
  open: (input) => deferred(calls.open, input),
  handOff: (sessionId) => void calls.handOff.push(sessionId),
  clearDraft: () => {
    calls.clearDraft += 1;
  },
  connectionState: () => calls.connection,
});

export const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};

export interface EmptySessionHarness {
  calls: Calls;
  store: EmptySessionStore;
  choose: (input?: SessionNewInput) => void;
  // The screen's send of the Composer's current draft, which Retry asks for on a New worktree.
  sendDraft: Mock<() => void>;
  // Retry, or a finished sign-in.
  retry: () => void;
  // The Connection goes down, so a call failing with no answer is a drop.
  drop: () => void;
  // The Connection reopens.
  reconnect: () => void;
}

const noCalls = (): Calls => ({
  open: [],
  handOff: [],
  clearDraft: 0,
  connection: 'open',
});

// The Connection dropping, and reopening to open the Empty Session again.
const connectionCauses = (
  calls: Calls,
  store: EmptySessionStore,
): Pick<EmptySessionHarness, 'drop' | 'reconnect'> => ({
  drop: () => {
    calls.connection = 'reconnecting';
  },
  reconnect: () => {
    calls.connection = 'open';
    store.openAgain({ by: 'connection' });
  },
});

// Retry with a spy for the screen's draft send.
function retryCause(
  store: EmptySessionStore,
): Pick<EmptySessionHarness, 'sendDraft' | 'retry'> {
  const sendDraft = vi.fn<() => void>();

  return {
    sendDraft,
    retry: () => store.openAgain({ by: 'user', sendDraft }),
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
    ...retryCause(store),
    ...connectionCauses(calls, store),
  };
}
