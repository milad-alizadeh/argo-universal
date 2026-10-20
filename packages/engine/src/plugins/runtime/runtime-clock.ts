import { realClock } from '../clock';
import type { TestRequests } from '../host/test-requests';
import type { TestClockState } from '../protocol/test-control';
import { PluginTestClock, requireAdvance } from '../worker/test-clock';

// Advances the runtime's deadlines and the worker realm on one configured clock.
export class RuntimeClock {
  readonly source;
  private activity = 0;

  constructor(
    private readonly requests: TestRequests,
    start?: number,
  ) {
    this.source = start === undefined ? realClock : new PluginTestClock(start);
  }

  async during<T>(call: () => Promise<T>): Promise<T> {
    this.activity += 1;

    const reply = await call();

    this.activity += 1;

    return reply;
  }

  public async advance(pluginId: string, ms: number): Promise<void> {
    const clock = this.requireClock(ms);
    const until = clock.now() + ms;
    let worker = await this.settledClock(pluginId);

    do {
      worker = await this.step(pluginId, { clock, worker, until });
    } while (hasWork(clock, worker, until));
  }

  private requireClock(ms: number): PluginTestClock {
    if (!(this.source instanceof PluginTestClock))
      throw new Error('Plugin has no test clock');

    requireAdvance(ms);

    return this.source;
  }

  private async step(
    pluginId: string,
    { clock, worker, until }: ClockStep,
  ): Promise<TestClockState> {
    const at = Math.min(until, clock.nextAt() ?? until, worker.nextAt ?? until);

    await clock.advance(at - clock.now());
    await this.requests.send(pluginId, {
      action: 'advanceClock',
      ms: at - worker.now,
    });

    return this.settledClock(pluginId);
  }

  /*
   * A worker timer can start another Hook over IPC. Drain its messages before
   * choosing the next deadline, so the runtime and worker advance together.
   */
  private async settledClock(pluginId: string): Promise<TestClockState> {
    for (;;) {
      const activity = this.activity;

      const state = await this.requests.send(pluginId, {
        action: 'clockState',
      });

      if (activity === this.activity) return state;
    }
  }
}

type ClockStep = {
  clock: PluginTestClock;
  worker: TestClockState;
  until: number;
};

function hasWork(
  clock: PluginTestClock,
  worker: TestClockState,
  until: number,
): boolean {
  return clock.now() < until || due(clock.nextAt(), worker.nextAt, until);
}

function due(
  runtime: number | null,
  worker: number | null,
  until: number,
): boolean {
  return runtime === until || worker === until;
}
