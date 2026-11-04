import {
  liveAnswer,
  type HashedTree,
  type LiveAnswer,
} from '@repo/contracts/plugins/page-draw';
import type { WireJson } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import type { Drawn } from './plugin-draws';
import type { Outcome } from './draw-calls';

// A live page's answers go out at most once a frame; the trees it yields between are folded into the latest.
export const liveFrameMs = 16;

type Next = { root: WireJson } | { end: Outcome };

/*
 * The trees a live draw's worker sends, latest first: a tree that arrives while a frame is open replaces the
 * one before it, and the frame closes on the Plugin clock. The draw's end waits for the frame open, so its
 * last tree still goes out.
 */
export class LatestFrames {
  private latest: WireJson | undefined;
  private ready = false;
  private ended: Outcome | undefined;
  private closing: (() => void) | undefined;
  private wake: (() => void) | undefined;

  public constructor(private readonly clock: PluginClock) {}

  public push(root: WireJson): void {
    this.latest = root;
    this.closing ??= this.clock.schedule(() => this.close(), liveFrameMs);
  }

  public end(outcome: Outcome): void {
    this.ended = outcome;

    if (!this.closing) return this.notify();

    this.closing();
    this.close();
  }

  // The next tree or the end, or null once the signal aborts.
  public async next(signal: AbortSignal): Promise<Next | null> {
    for (;;) {
      if (signal.aborted) return null;

      const taken = this.take();

      if (taken) return taken;

      await this.waited(signal);
    }
  }

  private take(): Next | undefined {
    if (this.ready && this.latest !== undefined) {
      const root = this.latest;

      this.ready = false;
      this.latest = undefined;

      return { root };
    }

    return this.ended && !this.closing ? { end: this.ended } : undefined;
  }

  private close(): void {
    this.closing = undefined;
    this.ready = this.latest !== undefined;
    this.notify();
  }

  private notify(): void {
    const wake = this.wake;

    this.wake = undefined;
    wake?.();
  }

  private waited(signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const done = (): void => {
        signal.removeEventListener('abort', done);
        resolve();
      };

      this.wake = done;
      signal.addEventListener('abort', done, { once: true });
    });
  }
}

// One live subscription: its frames, how each tree is checked, the tree the App keeps, and how to stop it.
export type Live = {
  frames: LatestFrames;
  check: (root: WireJson) => Drawn;
  known: string | undefined;
  signal: AbortSignal;
  stop: () => void;
};

/*
 * A live page's answers (ADR-0050): the first tree whole, or unchanged against the one the App keeps, then
 * ADR-0031's keyed patches between each tree and the one sent before. A tree that fails its checks, or a
 * Loader that throws or stops with its Plugin, answers why and ends the stream. However the stream ends, the
 * worker is told to stop its Loader.
 */
export async function* liveAnswers(live: Live): AsyncGenerator<LiveAnswer> {
  const { frames, signal, stop } = live;
  let sent: HashedTree | undefined;

  signal.addEventListener('abort', stop, { once: true });

  try {
    for (;;) {
      const next = await frames.next(signal);

      if (next === null) return;

      if ('end' in next) return yield* endOf(next.end);

      const checked = live.check(next.root);

      if (!checked.ok) return yield { kind: 'failed', error: checked.error };

      const answer = liveAnswer(checked.root, sent, live.known);

      if (!answer) continue;

      sent = { root: checked.root, hash: answer.hash };

      yield answer;
    }
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
  }
}

// A Loader that ended on its own ends the stream quietly; any other end says why.
function* endOf(outcome: Outcome): Generator<LiveAnswer> {
  if ('ok' in outcome) return yield { kind: 'failed', error: outcome.error };

  if (outcome.action === 'failed')
    return yield { kind: 'failed', error: outcome.error };
}
