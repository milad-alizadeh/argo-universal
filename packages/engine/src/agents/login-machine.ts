import type { AgentLoginSnapshot } from '@repo/contracts';
import { assign, fromPromise, setup, type ActorRefFrom } from 'xstate';
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
  fail: (error: unknown) => void;
};
type LoginContext = {
  ports: LoginMachineInput;
  methodId: string;
  outcome: LoginOutcome;
};
const authLoginOutcome = (status: LoginAgentOutcome['status']): LoginOutcome =>
  status === 'authentication-required' ? 'failed' : status;

export const loginMachine = setup({
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
      outcome: (_, params: { outcome: LoginOutcome }): LoginOutcome =>
        params.outcome,
    }),
    rememberMethod: assign({
      methodId: (_, params: { methodId: string }): string => params.methodId,
    }),
    fail: ({ context }, params: { error: unknown }): void =>
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
        params: ({ event }): { outcome: LoginOutcome } => ({
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
        onError: {
          target: 'closing',
          actions: [
            {
              type: 'fail',
              params: ({ event }): { error: unknown } => ({
                error: event.error,
              }),
            },
            {
              type: 'rememberLoginOutcome',
              params: ({ event }): { outcome: LoginOutcome } => ({
                outcome:
                  event.error instanceof AgentLoginInUseError
                    ? 'in-use'
                    : 'failed',
              }),
            },
          ],
        },
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
        onError: {
          target: 'closing',
          actions: {
            type: 'fail',
            params: ({ event }): { error: unknown } => ({ error: event.error }),
          },
        },
      },
      states: {
        waiting: { on: { request: 'awaiting-browser' } },
        'awaiting-browser': { on: { answer: 'waiting' } },
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
            params: ({ event }): { outcome: LoginOutcome } => ({
              outcome: authLoginOutcome(event.output.status),
            }),
          },
        },
        onError: {
          target: 'closing',
          actions: {
            type: 'fail',
            params: ({ event }): { error: unknown } => ({ error: event.error }),
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
        onDone: { target: 'finished' },
        onError: {
          target: 'cleanup-failed',
          actions: {
            type: 'fail',
            params: ({ event }): { error: unknown } => ({ error: event.error }),
          },
        },
      },
    },
    finished: { type: 'final' },
    'cleanup-failed': { type: 'final' },
  },
});
export type LoginActor = ActorRefFrom<typeof loginMachine>;
