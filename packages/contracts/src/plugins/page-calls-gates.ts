import type { PauseClock } from './edit-pauses';

type Waiting = { at: number; fire: () => Promise<void> };

// A clock that moves only when the test advances it.
export class TestClock {
  private now = 0;
  private waiting: Waiting[] = [];

  readonly wait: PauseClock = (ms, fire) => {
    const timer = { at: this.now + ms, fire };

    this.waiting.push(timer);

    return () => {
      this.waiting = this.waiting.filter((other) => other !== timer);
    };
  };

  async advance(ms: number): Promise<void> {
    this.now += ms;

    const due = this.waiting.filter(({ at }) => at <= this.now);

    this.waiting = this.waiting.filter((timer) => !due.includes(timer));

    await Promise.all(due.map(({ fire }) => fire()));
  }
}

// A promise the test settles: `settle()` resolves it, `settle(error)` rejects it with that error.
export class Gate {
  private readonly settled = Promise.withResolvers<void>();
  readonly promise = this.settled.promise;

  readonly settle = (error?: string): void => {
    if (error) this.settled.reject(new Error(error));
    else this.settled.resolve();
  };
}
