import type { PauseClock } from '@repo/contracts/plugins/page-calls';

type Timer = { at: number; fire: () => Promise<void> };

/*
 * The clock a test's page views wait on for their edits to pause, as the App's real clock does: it moves only
 * when the test advances it, and an advance waits for the changes it lets land.
 */
export class PageClock {
  private now = 0;
  private readonly timers = new Set<Timer>();

  readonly wait: PauseClock = (ms, fire) => {
    const timer = { at: this.now + ms, fire };

    this.timers.add(timer);

    return () => this.timers.delete(timer);
  };

  async advance(ms: number): Promise<void> {
    this.now += ms;
    const due = [...this.timers].filter(({ at }) => at <= this.now);

    for (const timer of due) this.timers.delete(timer);

    await Promise.all(due.map(({ fire }) => fire()));
  }
}
