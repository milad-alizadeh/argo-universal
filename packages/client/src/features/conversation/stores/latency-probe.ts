import type { VoicePeer } from '../types/conversation-environment';
import type { PeerStats } from '../utils/peer-stats';
import { TurnGaps, turnGapLevels } from '../utils/turn-gaps';

/*
 * SPIKE (latency on a phone, docs/research/voice-mode.md): times a call's start and its turn gaps and samples its link,
 * from the same code on the desktop App and on a phone, so each phone number has a desktop number beside it. It lives on
 * the spike's branch only. Nothing it reads leaves the App: the panel shows it and the person copies it.
 */

// Milliseconds from the tap to each step of a call's start; a step not reached yet is absent.
export interface StartTimes {
  microphone?: number;
  offer?: number;
  answer?: number;
  accepted?: number;
  firstPackets?: number;
  firstVoice?: number;
}

interface LinkQuality {
  samples: number;
  rttMs: number | undefined;
  rttMaxMs: number | undefined;
  jitterMs: number | undefined;
  jitterMaxMs: number | undefined;
  // How long the voice's sound waits in the jitter buffer before it is played, averaged over the call.
  bufferMs: number | undefined;
  lossPercent: number | undefined;
}

export interface LatencyReport {
  // Whether the call it describes is still running.
  live: boolean;
  start: StartTimes;
  // Each turn gap of the call in order, in milliseconds.
  gaps: readonly number[];
  link: LinkQuality;
  // The levels read last, to check the thresholds against the room.
  levels: { input: number; output: number };
}

const percentScale = 100;

const millisecondsPerSecond = 1000;

const sampleEveryMs = 50;

// The panel hears of every fifth sample, and of each step and gap at once.
const notifyEvery = 5;

const now = (): number => performance.now();

// A running mean and maximum of one number of the link.
class Spread {
  private sum = 0;
  private count = 0;
  public max: number | undefined;

  public add(value: number | undefined): void {
    if (value === undefined) return;
    this.sum += value;
    this.count += 1;
    this.max = Math.max(this.max ?? value, value);
  }

  public mean(): number | undefined {
    return this.count === 0 ? undefined : this.sum / this.count;
  }
}

const lossOf = ({
  packetsLost,
  packetsReceived,
}: PeerStats): number | undefined => {
  const sent = packetsLost + packetsReceived;

  return sent === 0 ? undefined : (packetsLost / sent) * percentScale;
};

const bufferOf = ({
  bufferSeconds,
  bufferEmitted,
}: PeerStats): number | undefined =>
  bufferEmitted === 0
    ? undefined
    : (bufferSeconds / bufferEmitted) * millisecondsPerSecond;

// One call's measurements, from its tap until the next call's.
class Measured {
  public readonly tappedAt = now();
  public readonly start: StartTimes = {};
  public readonly turns = new TurnGaps();
  public readonly rtt = new Spread();
  public readonly jitter = new Spread();
  public samples = 0;
  public last: PeerStats | undefined;
  public live = true;

  public mark(step: keyof StartTimes): boolean {
    if (this.start[step] !== undefined) return false;
    this.start[step] = now() - this.tappedAt;

    return true;
  }

  // Takes one reading; true when it reached a step of the start or closed a turn gap.
  public take(stats: PeerStats): boolean {
    this.samples += 1;
    this.last = stats;
    this.rtt.add(stats.rttMs);
    this.jitter.add(stats.jitterMs);

    const flowing = stats.packetsReceived > 0 && this.mark('firstPackets');

    const spoke = stats.output > turnGapLevels.voice && this.mark('firstVoice');

    const gap = this.turns.sample(now(), stats.input, stats.output);

    return flowing || spoke || gap !== undefined;
  }

  public report(): LatencyReport {
    return {
      live: this.live,
      start: { ...this.start },
      gaps: [...this.turns.gaps],
      link: {
        samples: this.samples,
        rttMs: this.rtt.mean(),
        rttMaxMs: this.rtt.max,
        jitterMs: this.jitter.mean(),
        jitterMaxMs: this.jitter.max,
        bufferMs: this.last && bufferOf(this.last),
        lossPercent: this.last && lossOf(this.last),
      },
      levels: {
        input: this.last?.input ?? 0,
        output: this.last?.output ?? 0,
      },
    };
  }
}

class LatencyProbe {
  private measured: Measured | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private snapshot: LatencyReport | undefined;
  private readonly listeners = new Set<() => void>();

  // The tap: a new call's clock starts, and the last call's numbers go.
  public begin(): void {
    this.stop();
    this.measured = new Measured();
    this.publish();
  }

  public mark(step: keyof StartTimes): void {
    if (this.measured?.live && this.measured.mark(step)) this.publish();
  }

  // Samples the peer's stats until the call ends; a peer that has none, as a test's, is left alone.
  public watch(peer: Pick<VoicePeer, 'stats'>): void {
    const { measured } = this;
    const { stats } = peer;

    if (!measured || !stats) return;

    this.timer = setInterval(() => {
      void stats
        .call(peer)
        .then((read) => this.took(measured, read))
        .catch(() => {});
    }, sampleEveryMs);
  }

  private took(measured: Measured, stats: PeerStats): void {
    if (!measured.live) return;

    const told = measured.take(stats);

    if (told || measured.samples % notifyEvery === 0) this.publish();
  }

  // The call is over; its numbers stay to be read and copied.
  public stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;

    if (!this.measured?.live) return;
    this.measured.live = false;
    this.publish();
  }

  private publish(): void {
    this.snapshot = this.measured?.report();

    for (const listener of this.listeners) listener();
  }

  public read = (): LatencyReport | undefined => this.snapshot;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return (): void => void this.listeners.delete(listener);
  };
}

// One probe for the App, as one call runs per App.
export const latencyProbe = new LatencyProbe();
