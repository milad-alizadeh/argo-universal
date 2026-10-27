import { realClock, type PluginClock } from '../clock';
import type { HostCommand } from '../protocol/runtime';
import type { TestClockState, TestReply } from '../protocol/test-control';
import { PluginTestClock, requireAdvance } from '../worker/test-clock';
import { TestRequests } from './test-requests';

type WorkerClock = { pluginId: string; state: TestClockState };

type TestControlInput = {
  clock?: PluginClock;
  tell: (command: Extract<HostCommand, { type: 'test' }>) => void;
  // The Plugins whose workers share the clock: every running one.
  running: () => string[];
};

export function runtimeClockSource(start: number | undefined): PluginClock {
  return start === undefined ? realClock : new PluginTestClock(start);
}

/*
 * What a test kit controls in a running Plugin runtime: the clock the Server's deadlines and every
 * live worker realm share. On the real clock, advancing it throws.
 */
export class TestControl {
  public readonly clock: PluginClock;
  private readonly requests: TestRequests;
  private readonly running: () => string[];
  private activity = 0;

  public constructor({ clock = realClock, tell, running }: TestControlInput) {
    this.clock = clock;
    this.requests = new TestRequests(tell);
    this.running = running;
  }

  public workerStart(): number | undefined {
    return this.clock instanceof PluginTestClock ? this.clock.now() : undefined;
  }

  // Marks each Plugin call's start and end, so the clock drains the IPC it causes before moving on.
  public async during<T>(call: () => Promise<T>): Promise<T> {
    this.activity += 1;

    try {
      return await call();
    } finally {
      this.activity += 1;
    }
  }

  public settle(reply: TestReply): void {
    this.requests.settle(reply);
  }

  public async advanceClock(ms: number): Promise<void> {
    const clock = this.requireClock(ms);
    const until = clock.now() + ms;
    let workers = await this.settledClocks();

    do {
      const at = nextTime(clock, workers, until);
      await clock.advance(at - clock.now());
      await this.advanceWorkers(at);
      workers = await this.settledClocks();
    } while (hasDueWork(clock, workers, until));
  }

  private async advanceWorkers(at: number): Promise<void> {
    for (const { pluginId, state } of await this.settledClocks())
      await this.requests.send(pluginId, {
        action: 'advanceClock',
        ms: at - state.now,
      });
  }

  private requireClock(ms: number): PluginTestClock {
    if (!(this.clock instanceof PluginTestClock))
      throw new Error('Plugin has no test clock');
    requireAdvance(ms);

    return this.clock;
  }

  // Drain IPC before choosing the next shared deadline.
  private async settledClocks(): Promise<WorkerClock[]> {
    for (;;) {
      const activity = this.activity;
      const ids = this.running();
      const states = await Promise.all(ids.map((id) => this.clockState(id)));

      if (this.stable(activity, ids, this.running())) return states;
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
