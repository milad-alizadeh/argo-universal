import type { AgentLoginSnapshot } from '@repo/contracts';
import {
  assign,
  fromPromise,
  setup,
  type SnapshotFrom,
  type ActorRefFrom,
} from 'xstate';
import type { LoginAgentOutcome } from './agent-launch';
import { AgentLoginInUseError } from './login-error';

export type LoginOutcome = Extract<
  AgentLoginSnapshot['status'],
  | 'ready'
  | 'cancelled'
  | 'failed'
  | 'timed-out'
  | 'in-use'
  | 'unsupported'
  | 'account-rejected'
>;

export type LoginEvent =
  | { type: 'choose'; methodId: string }
  | { type: 'request' }
  | { type: 'answer' }
  | { type: 'finish'; outcome: LoginOutcome };

export type LoginMachineInput = {
  open: () => Promise<boolean>;
  authenticate: (methodId: string) => Promise<void>;
  checkReady: () => Promise<LoginAgentOutcome>;
  close: () => Promise<void>;
  abort: () => void;
  fail: (cause: unknown) => void;
};

type LoginFailureParams = { error: unknown };

type LoginOutcomeParams = { outcome: LoginOutcome };

type LoginContext = {
  ports: LoginMachineInput;
  methodId: string;
  outcome: LoginOutcome;
};

const finishedState = 'finished';

const awaitingBrowserState = 'awaiting-browser';

const cleanupFailedState = 'cleanup-failed';

const authLoginOutcome = (status: LoginAgentOutcome['status']): LoginOutcome =>
  status === 'authentication-required' ? 'failed' : status;

const loginFailureOutcome = (cause: unknown): LoginOutcome =>
  cause instanceof AgentLoginInUseError ? 'in-use' : 'failed';

const loginFailureTransition = {
  target: 'closing',
  actions: [
    {
      type: 'fail',
      params: ({
        event,
      }: {
        event: { error: unknown };
      }): LoginFailureParams => ({ error: event.error }),
    },
    {
      type: 'rememberLoginOutcome',
      params: ({
        event,
      }: {
        event: { error: unknown };
      }): LoginOutcomeParams => ({
        outcome: loginFailureOutcome(event.error),
      }),
    },
  ],
} as const;

export const loginMachine = setup({
  // SAFETY: XState v5 reads these as type-only declarations; the empty objects are never used as runtime values.
  types: {
    input: {} as LoginMachineInput,
    context: {} as LoginContext,
    events: {} as LoginEvent,
  },
  actors: {
    open: fromPromise<boolean, LoginMachineInput>(({ input }) => input.open()),
    authenticate: fromPromise<void, LoginContext>(({ input }) =>
      input.ports.authenticate(input.methodId),
    ),
    checkReady: fromPromise<LoginAgentOutcome, LoginMachineInput>(({ input }) =>
      input.checkReady(),
    ),
    close: fromPromise<void, LoginMachineInput>(({ input }) => input.close()),
  },
  actions: {
    rememberLoginOutcome: assign({
      outcome: (_, params: LoginOutcomeParams): LoginOutcome => params.outcome,
    }),
    rememberMethod: assign({
      methodId: (_, params: { methodId: string }): string => params.methodId,
    }),
    fail: ({ context }, params: LoginFailureParams): void =>
      context.ports.fail(params.error),
    abort: ({ context }): void => context.ports.abort(),
  },
}).createMachine({
  id: 'agentLogin',
  initial: 'starting',
  context: ({ input }): LoginContext => ({
    ports: input,
    methodId: '',
    outcome: 'failed',
  }),
  on: {
    finish: {
      target: '.closing',
      actions: {
        type: 'rememberLoginOutcome',
        params: ({ event }): LoginOutcomeParams => ({
          outcome: event.outcome,
        }),
      },
    },
  },
  states: {
    starting: {
      invoke: {
        id: 'open',
        src: 'open',
        input: ({ context }) => context.ports,
        onDone: [
          {
            guard: ({ event }): boolean => event.output,
            target: 'choose-method',
          },
          {
            target: 'closing',
            actions: {
              type: 'rememberLoginOutcome',
              params: { outcome: 'unsupported' },
            },
          },
        ],
        onError: loginFailureTransition,
      },
    },
    'choose-method': {
      on: {
        choose: {
          target: 'authenticating',
          actions: {
            type: 'rememberMethod',
            params: ({ event }) => ({ methodId: event.methodId }),
          },
        },
      },
    },
    authenticating: {
      initial: 'waiting',
      invoke: {
        id: 'authenticate',
        src: 'authenticate',
        input: ({ context }) => context,
        onDone: { target: 'checking' },
        onError: loginFailureTransition,
      },
      states: {
        waiting: { on: { request: awaitingBrowserState } },
        [awaitingBrowserState]: { on: { answer: 'waiting' } },
      },
    },
    checking: {
      invoke: {
        id: 'checkReady',
        src: 'checkReady',
        input: ({ context }) => context.ports,
        onDone: {
          target: 'closing',
          actions: {
            type: 'rememberLoginOutcome',
            params: ({ event }): LoginOutcomeParams => ({
              outcome: authLoginOutcome(event.output.status),
            }),
          },
        },
        onError: {
          target: 'closing',
          actions: {
            type: 'fail',
            params: ({ event }): LoginFailureParams => ({ error: event.error }),
          },
        },
      },
    },
    closing: {
      entry: { type: 'abort' },
      on: { finish: {} },
      invoke: {
        id: 'close',
        src: 'close',
        input: ({ context }) => context.ports,
        onDone: { target: finishedState },
        onError: {
          target: cleanupFailedState,
          actions: {
            type: 'fail',
            params: ({ event }): LoginFailureParams => ({ error: event.error }),
          },
        },
      },
    },
    [finishedState]: { type: 'final' },
    [cleanupFailedState]: { type: 'final' },
  },
});

export type LoginActor = ActorRefFrom<typeof loginMachine>;

export const loginStatus = (
  state: SnapshotFrom<typeof loginMachine>,
): AgentLoginSnapshot['status'] => {
  if (state.matches(finishedState)) return state.context.outcome;

  if (state.matches({ authenticating: awaitingBrowserState }))
    return awaitingBrowserState;

  if (state.matches('authenticating')) return 'authenticating';
  const value = state.value;

  if (typeof value !== 'string' || value === finishedState)
    throw new Error('Unexpected login state');

  return value;
};
