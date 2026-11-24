import { createActor, fromPromise, setup, type ActorRefFrom } from 'xstate';

interface ScheduleClock {
  now: () => number;
  nextAt: () => number | undefined;
  deliver: (signal: AbortSignal) => Promise<void>;
  // The timer has no deadline left: delivered for good, or past its end time.
  ended: () => void;
}

const maximumDelay = 2147483647;

const retryDelay = 1000;

const scheduleMachine = setup({
  // SAFETY: XState consumes these declarations only for typing input and context.
  types: { context: {} as ScheduleClock, input: {} as ScheduleClock },
  delays: {
    deadline: ({ context }) =>
      Math.min(
        maximumDelay,
        Math.max(0, (context.nextAt() ?? Infinity) - context.now()),
      ),
    retry: retryDelay,
  },
  guards: {
    inactive: ({ context }) => context.nextAt() === undefined,
    due: ({ context }) => (context.nextAt() ?? Infinity) <= context.now(),
  },
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
      always: { guard: 'inactive', target: 'inactive' },
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
    retrying: {
      always: { guard: 'inactive', target: 'inactive' },
      after: { retry: 'waiting' },
    },
    inactive: { type: 'final', entry: ({ context }) => context.ended() },
  },
});

type ScheduleActor = ActorRefFrom<typeof scheduleMachine>;

interface ScheduleDeadlines {
  nextAt: (id: string) => number | undefined;
  deliver: (id: string, signal: AbortSignal) => Promise<void>;
  ended?: (id: string) => void;
  now?: () => number;
}

export class ScheduleTimers {
  private readonly actors = new Map<string, ScheduleActor>();

  public constructor(
    private readonly deadlines: ScheduleDeadlines,
    private readonly stopping?: AbortSignal,
  ) {
    stopping?.addEventListener('abort', () => this.stopAll(), { once: true });
  }

  public refresh(id: string): void {
    this.actors.get(id)?.stop();
    this.actors.delete(id);

    if (this.stopping?.aborted || this.deadlines.nextAt(id) === undefined)
      return;

    const actor = createActor(scheduleMachine, {
      input: {
        now: () => (this.deadlines.now ?? Date.now)(),
        nextAt: () => this.deadlines.nextAt(id),
        deliver: (signal) => this.deadlines.deliver(id, signal),
        ended: () => this.deadlines.ended?.(id),
      },
    });

    this.actors.set(id, actor);
    actor.subscribe({
      complete: () => {
        if (this.actors.get(id) === actor) this.actors.delete(id);
      },
    });
    actor.start();
  }

  private stopAll(): void {
    for (const actor of this.actors.values()) actor.stop();
    this.actors.clear();
  }
}
