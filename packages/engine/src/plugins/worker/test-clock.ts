import { setImmediate } from 'node:timers/promises';
import type { z } from 'zod';
import type {
  TestAction,
  TestClockState,
  TestCommand,
  TestReply,
} from '../protocol/test-control.ts';

export class PluginTestClock {
  private time: number;
  constructor(time = 0) {
    this.time = time;
  }
  private readonly pending: Array<{ at: number; resolve: () => void }> = [];
  readonly now = (): number => this.time;
  readonly delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      this.schedule(resolve, ms);
    });

  readonly schedule = (resolve: () => void, ms: number): (() => void) => {
    const timer = { at: this.time + Math.max(0, ms), resolve };
    this.pending.push(timer);

    return () => {
      const index = this.pending.indexOf(timer);

      if (index >= 0) this.pending.splice(index, 1);
    };
  };

  readonly nextAt = (): number | null =>
    this.pending.length ? Math.min(...this.pending.map(({ at }) => at)) : null;

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

export function requireAdvance(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0)
    throw new Error('Clock advance must be finite and nonnegative');
}

// The worker's side of the runtime's test control: it runs one action on the realm's clock and answers it.
export async function answerTest(
  clock: PluginTestClock | undefined,
  { id, action }: z.infer<typeof TestCommand>,
): Promise<TestReply> {
  try {
    return { type: 'test.done', id, clock: await runTest(clock, action) };
  } catch (error) {
    return { type: 'test.done', id, error: String(error) };
  }
}

async function runTest(
  clock: PluginTestClock | undefined,
  action: TestAction,
): Promise<TestClockState> {
  if (!clock) throw new Error('Plugin has no test clock');

  await clock.advance(action.action === 'advanceClock' ? action.ms : 0);

  return { now: clock.now(), nextAt: clock.nextAt() };
}
