import { assign, assertEvent, setup } from 'xstate';

const restartWindowMs = 300_000;

const restartLimit = 3;

export const hostBudgetExhausted =
  'Plugin host restart budget exhausted (3 in 5 minutes)';

type HostInput = {
  now: () => number;
  start: () => void;
  crash: (message: string) => void;
};

type HostContext = HostInput & { restarts: number[] };

type HostEvent =
  | { type: 'host.exited'; reason: string }
  | { type: 'host.close' };

const recentRestarts = (context: HostContext): number[] => {
  const now = context.now();

  return context.restarts.filter((time) => now - time < restartWindowMs);
};

export const hostLifecycleMachine = setup({
  // SAFETY: XState reads these declarations only as types, never runtime input.
  types: {
    input: {} as HostInput,
    context: {} as HostContext,
    events: {} as HostEvent,
  },
  actions: {
    start: ({ context }): void => context.start(),
    reportCrash: ({ context, event }): void => {
      assertEvent(event, 'host.exited');
      context.crash(`Plugin host exited (${event.reason})`);
    },
    reportExhausted: ({ context }): void => context.crash(hostBudgetExhausted),
    recordRestart: assign({
      restarts: ({ context }) => [...recentRestarts(context), context.now()],
    }),
  },
  guards: {
    canRestart: ({ context }): boolean =>
      recentRestarts(context).length < restartLimit,
  },
}).createMachine({
  id: 'pluginHost',
  context: ({ input }) => ({ ...input, restarts: [] }),
  initial: 'running',
  on: { 'host.close': { target: '.closed' } },
  states: {
    running: {
      entry: 'start',
      on: { 'host.exited': { target: 'restarting', actions: 'reportCrash' } },
    },
    restarting: {
      always: [
        { guard: 'canRestart', target: 'running', actions: 'recordRestart' },
        { target: 'exhausted', actions: 'reportExhausted' },
      ],
    },
    exhausted: {},
    closed: { type: 'final' },
  },
});
