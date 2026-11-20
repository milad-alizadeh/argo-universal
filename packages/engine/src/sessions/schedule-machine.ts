import { createActor, fromPromise, setup, type ActorRefFrom } from 'xstate';

interface ScheduleClock {
  now: () => number;
  nextAt: () => number;
  deliver: (signal: AbortSignal) => Promise<void>;
}

const maximumDelay = 2147483647;

const retryDelay = 1000;

const scheduleMachine = setup({
  // SAFETY: XState consumes these declarations only for typing input and context.
  types: { context: {} as ScheduleClock, input: {} as ScheduleClock },
  delays: {
    deadline: ({ context }) =>
      Math.min(maximumDelay, Math.max(0, context.nextAt() - context.now())),
    retry: retryDelay,
  },
  guards: { due: ({ context }) => context.nextAt() <= context.now() },
  actors: {
    delivery: fromPromise<void, ScheduleClock>(({ input, signal }) =>
      input.deliver(signal),
    ),
  },
}).createMachine({
  id: 'schedule',
  initial: 'waiting',
  context: ({ input }) => input,
  states: {
    waiting: {
      after: {
        deadline: [
          { guard: 'due', target: 'delivering' },
          { target: 'waiting', reenter: true },
        ],
      },
    },
    delivering: {
      invoke: {
        src: 'delivery',
        input: ({ context }) => context,
        onDone: 'waiting',
        onError: 'retrying',
      },
    },
    retrying: { after: { retry: 'waiting' } },
  },
});

export type ScheduleActor = ActorRefFrom<typeof scheduleMachine>;

export const startSchedule = (input: ScheduleClock): ScheduleActor =>
  createActor(scheduleMachine, { input }).start();
