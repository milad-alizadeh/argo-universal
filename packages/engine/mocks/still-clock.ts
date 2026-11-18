import type { PluginClock } from '../src/plugins/clock';

type Timer = { at: number; callback: () => void };

// A clock that stands still until a test advances it, and runs the timers that come due as it does.
export class StillClock implements PluginClock {
  private at = 0;
  private timers: Timer[] = [];

  now = (): number => this.at;

  delay = async (): Promise<void> => {};

  schedule: PluginClock['schedule'] = (callback, ms) => {
    const timer = { at: this.at + ms, callback };

    this.timers.push(timer);

    return () => {
      this.timers = this.timers.filter((kept) => kept !== timer);
    };
  };

  advance(ms: number): void {
    this.at += ms;

    const due = this.timers.filter(({ at }) => at <= this.at);

    this.timers = this.timers.filter(({ at }) => at > this.at);

    for (const { callback } of due) callback();
  }
}
