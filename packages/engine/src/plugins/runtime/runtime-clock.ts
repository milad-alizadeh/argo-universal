import { realClock, type PluginClock } from '../clock';
import type { TestRequests } from '../host/test-requests';
import type { TestClockState } from '../protocol/test-control';
import { PluginTestClock, requireAdvance } from '../worker/test-clock';

type WorkerClock = { pluginId: string; state: TestClockState };

export function runtimeClockSource(start: number | undefined): PluginClock {
  return start === undefined ? realClock : new PluginTestClock(start);
}

// Advances runtime deadlines and every live worker realm on one configured clock.
export class RuntimeClock {
  readonly source;
  private activity = 0;

  constructor(
    private readonly requests: TestRequests,
    clock: PluginClock = realClock,
  ) {
    this.source = clock;
  }

  workerStart(): number | undefined {
    return this.source instanceof PluginTestClock
      ? this.source.now()
      : undefined;
  }

  async during<T>(call: () => Promise<T>): Promise<T> {
    this.activity += 1;

    try {
      return await call();
    } finally {
      this.activity += 1;
    }
  }

  public async advance(pluginIds: () => string[], ms: number): Promise<void> {
    const clock = this.requireClock(ms);
    const until = clock.now() + ms;
    let workers = await this.settledClocks(pluginIds);

    do {
      const at = nextTime(clock, workers, until);
      await clock.advance(at - clock.now());
      await this.advanceWorkers(pluginIds, at);
      workers = await this.settledClocks(pluginIds);
    } while (hasDueWork(clock, workers, until));
  }

  private async advanceWorkers(
    pluginIds: () => string[],
    at: number,
  ): Promise<void> {
    for (const { pluginId, state } of await this.settledClocks(pluginIds))
      await this.requests.send(pluginId, {
        action: 'advanceClock',
        ms: at - state.now,
      });
  }

  private requireClock(ms: number): PluginTestClock {
    if (!(this.source instanceof PluginTestClock))
      throw new Error('Plugin has no test clock');
    requireAdvance(ms);

    return this.source;
  }

  // Drain IPC before choosing the next shared deadline.
  private async settledClocks(
    pluginIds: () => string[],
  ): Promise<WorkerClock[]> {
    for (;;) {
      const activity = this.activity;
      const ids = pluginIds();
      const states = await Promise.all(ids.map((id) => this.clockState(id)));

      if (this.stable(activity, ids, pluginIds())) return states;
    }
  }

  private stable(activity: number, before: string[], after: string[]): boolean {
    return activity === this.activity && before.join() === after.join();
  }

  private async clockState(pluginId: string): Promise<WorkerClock> {
    return {
      pluginId,
      state: await this.requests.send(pluginId, { action: 'clockState' }),
    };
  }
}

function nextTime(
  clock: PluginTestClock,
  workers: WorkerClock[],
  until: number,
): number {
  return Math.min(
    until,
    clock.nextAt() ?? until,
    ...workers.map(({ state }) => state.nextAt ?? until),
  );
}

function hasDueWork(
  clock: PluginTestClock,
  workers: WorkerClock[],
  until: number,
): boolean {
  return clock.now() < until || dueAt(clock, workers, until);
}

function dueAt(
  clock: PluginTestClock,
  workers: WorkerClock[],
  until: number,
): boolean {
  return (
    clock.nextAt() === until ||
    workers.some(({ state }) => state.nextAt === until)
  );
}
