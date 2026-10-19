import { setImmediate } from 'node:timers/promises';

export class PluginTestClock {
  private time: number;
  constructor(time = 0) {
    this.time = time;
  }
  private readonly pending: Array<{ at: number; resolve: () => void }> = [];
  readonly now = (): number => this.time;
  readonly delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      this.pending.push({ at: this.time + Math.max(0, ms), resolve });
    });

  async advance(ms: number): Promise<void> {
    requireAdvance(ms);
    const until = this.time + ms;
    await setImmediate();

    while (this.pending.some((timer) => timer.at <= until)) {
      this.time = Math.min(...this.pending.map((timer) => timer.at));
      this.tick();
      await setImmediate();
    }

    this.time = until;
    await setImmediate();
  }

  private tick(): void {
    const due = this.pending.filter((timer) => timer.at <= this.time);

    for (const timer of due)
      this.pending.splice(this.pending.indexOf(timer), 1);

    for (const timer of due) timer.resolve();
  }
}

function requireAdvance(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0)
    throw new Error('Clock advance must be finite and nonnegative');
}
