export interface ElapsedAction {
  prepare?: () => Promise<void>;
  action: () => Promise<void>;
  ready: () => Promise<void>;
}

type Phase = 'prepare' | 'action' | 'ready';

interface Progress {
  phase: Phase;
  start?: number;
}

export type ElapsedSample =
  | { status: 'completed'; elapsedMs: number }
  | {
      status: 'failed' | 'timed-out';
      phase: Phase;
      elapsedMs: number | null;
      error: string;
    };

function failure(error: Error, { phase, start }: Progress): ElapsedSample {
  const message = error.message;
  const timedOut = error.name === 'TimeoutError';

  return {
    status: timedOut ? 'timed-out' : 'failed',
    phase,
    error: message,
    elapsedMs: start === undefined ? null : performance.now() - start,
  };
}

async function dispatch(
  action: ElapsedAction,
  progress: Progress,
): Promise<ElapsedSample> {
  await action.prepare?.();
  progress.phase = 'action';
  progress.start = performance.now();
  await action.action();
  progress.phase = 'ready';
  await action.ready();

  return { status: 'completed', elapsedMs: performance.now() - progress.start };
}

// One monotonic driver interval; preparation and any later settling are outside it.
export async function measureElapsed(
  action: ElapsedAction,
): Promise<ElapsedSample> {
  const progress: Progress = { phase: 'prepare' };

  try {
    return await dispatch(action, progress);
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error(String(error)),
      progress,
    );
  }
}

const completedTimes = (samples: readonly ElapsedSample[]): number[] =>
  samples
    .flatMap((sample) =>
      sample.status === 'completed' ? [sample.elapsedMs] : [],
    )
    .toSorted((a, b) => a - b);

interface Percentiles {
  p50Ms: number | null;
  p95Ms?: number;
  maxMs: number | null;
}

interface ElapsedSummary extends Percentiles {
  attempted: number;
  completed: number;
  failed: number;
  timedOut: number;
}

const rank = (values: number[], fraction: number): number =>
  values[Math.ceil(values.length * fraction) - 1] ?? 0;

const upperPercentile = (values: number[]): Pick<Percentiles, 'p95Ms'> =>
  values.length >= 20 ? { p95Ms: rank(values, 0.95) } : {};

function percentiles(completed: number[]): Percentiles {
  if (!completed.length) return { p50Ms: null, maxMs: null };

  return {
    p50Ms: rank(completed, 0.5),
    maxMs: rank(completed, 1),
    ...upperPercentile(completed),
  };
}

// Nearest-rank percentiles, with failed trials counted separately from completed latencies.
export function summarizeElapsed(
  samples: readonly ElapsedSample[],
): ElapsedSummary {
  const completed = completedTimes(samples);

  return {
    attempted: samples.length,
    completed: completed.length,
    failed: samples.filter((sample) => sample.status === 'failed').length,
    timedOut: samples.filter((sample) => sample.status === 'timed-out').length,
    ...percentiles(completed),
  };
}
