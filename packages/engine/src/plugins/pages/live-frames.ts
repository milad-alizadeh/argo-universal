import type { HashedTree } from '@repo/contracts/plugins/page-draw';
import { liveAnswer, type LiveAnswer } from '@repo/contracts/plugins/page-live';
import type { WireJson } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import type { Outcome } from './draw-calls';
import type { Drawn } from './plugin-draws';

type Failed = Extract<LiveAnswer, { kind: 'failed' }>;

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
    while (!signal.aborted) {
      const taken = this.take();

      if (taken) return taken;

      await this.waited(signal);
    }

    return null;
  }

  private take(): Next | null {
    return this.takeRoot() ?? this.takeEnd();
  }

  private takeRoot(): Next | null {
    const root = this.latest;

    if (!this.ready || root === undefined) return null;

    this.ready = false;
    this.latest = undefined;

    return { root };
  }

  // The end goes out once no frame is open.
  private takeEnd(): Next | null {
    return this.ended && !this.closing ? { end: this.ended } : null;
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

/*
 * One live subscription: its frames, how each tree is checked, what hears that its Loader failed rather than
 * stopped with its Plugin, the tree the App keeps, and how to stop it.
 */
export type Live = {
  frames: LatestFrames;
  check: (root: WireJson) => Drawn;
  threw: (error: string) => void;
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
  const { signal, stop } = live;
  const answering = new Answering(live);

  signal.addEventListener('abort', stop, { once: true });

  try {
    yield* answering.answers();
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
  }
}

// What one subscription answers next: an answer, null when nothing crosses, or that it is done.
type Step = LiveAnswer | null | 'done';

// One subscription's answers, from the tree it sent last.
class Answering {
  private sent: HashedTree | undefined;
  private over = false;

  public constructor(private readonly live: Live) {}

  public async *answers(): AsyncGenerator<LiveAnswer> {
    for (
      let step = await this.step();
      step !== 'done';
      step = await this.step()
    )
      if (step) yield step;
  }

  private async step(): Promise<Step> {
    if (this.over) return 'done';

    const next = await this.live.frames.next(this.live.signal);

    return next === null ? 'done' : this.stepOf(next);
  }

  private stepOf(next: Next): Step {
    if (!('end' in next)) return this.drawn(next.root);

    const threw = threwError(next.end);

    if (threw !== undefined) this.live.threw(threw);

    return this.ended(endOf(next.end));
  }

  private drawn(root: WireJson): Step {
    const checked = this.live.check(root);

    if (!checked.ok)
      return this.ended({ kind: 'failed', error: checked.error });

    const answer = liveAnswer(checked.root, this.sent, this.live.known);

    if (answer) this.sent = { root: checked.root, hash: answer.hash };

    return answer;
  }

  private ended(answer: LiveAnswer | null): Step {
    this.over = true;

    return answer ?? 'done';
  }
}

// Why the Loader failed, when it did; its Plugin stopping is not the page's failure.
const threwError = (outcome: Outcome): string | undefined =>
  'stopped' in outcome ? undefined : endOf(outcome)?.error;

// A Loader that ended on its own ends the stream quietly; any other end says why.
const endOf = (outcome: Outcome): Failed | null =>
  'ok' in outcome || outcome.action === 'failed'
    ? { kind: 'failed', error: outcome.error }
    : null;
