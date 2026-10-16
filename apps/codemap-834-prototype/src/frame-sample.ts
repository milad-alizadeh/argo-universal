import type { PanResult } from './model';

const millisecondsPerSecond = 1000;

const percentile = 0.95;

export const panDuration = 6000;

export interface FrameSample {
  start: number;
  last: number;
  intervals: number[];
  duration: number;
}

export function startSample(duration: number): FrameSample {
  const start = performance.now();

  return { start, last: start, intervals: [], duration };
}

export function sampleFrame(sample: FrameSample, now: number): number {
  sample.intervals.push(now - sample.last);
  sample.last = now;

  return now - sample.start;
}

export function sampleResult(sample: FrameSample, metric: string): PanResult {
  const times = sample.intervals.slice(1).sort((a, b) => a - b);
  const first = sample.intervals.at(0) ?? 0;
  const elapsed = sample.last - sample.start;

  return {
    frames: times.length,
    elapsedMs: elapsed,
    fps: (times.length * millisecondsPerSecond) / (elapsed - first),
    p95FrameMs: times.at(Math.floor(times.length * percentile)) ?? 0,
    metric,
  };
}
