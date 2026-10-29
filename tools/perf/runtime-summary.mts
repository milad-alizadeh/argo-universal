import { summarizeElapsed, type ElapsedSample } from './elapsed.mts';
import type { RuntimeCase } from './runtime-options.mts';
import type { RuntimeSample } from './runtime-report.mts';
import type { RuntimeTrial } from './runtime-types.mts';

function failureSample(
  trial: RuntimeTrial,
  elapsedMs: number | null,
): ElapsedSample {
  return {
    status: trial.status === 'timed-out' ? 'timed-out' : 'failed',
    phase: 'ready',
    elapsedMs,
    error: failureMessage(trial),
  };
}

function phaseSample(trial: RuntimeTrial, metric: string): ElapsedSample {
  const elapsedMs = phaseValue(trial, metric);

  if (trial.status !== 'completed') return failureSample(trial, elapsedMs);

  if (elapsedMs !== null) return { status: 'completed', elapsedMs };

  return failureSample(trial, elapsedMs);
}

function available(trial: RuntimeTrial, metric: string): boolean {
  return trial.status !== 'completed' || phaseValue(trial, metric) !== null;
}

function phaseSummary(
  trials: RuntimeTrial[],
  metric: string,
): ReturnType<typeof summarizeElapsed> & { unavailable: number } {
  const included = trials.flatMap((trial) =>
    available(trial, metric) ? [phaseSample(trial, metric)] : [],
  );

  return {
    ...summarizeElapsed(included),
    unavailable: trials.length - included.length,
  };
}

interface RuntimeCaseSummary {
  case: RuntimeCase;
  attempted: number;
  completed: number;
  failed: number;
  timedOut: number;
  phases: Record<string, ReturnType<typeof phaseSummary>>;
}

function caseSummary(
  kind: RuntimeCase,
  samples: RuntimeSample[],
): RuntimeCaseSummary {
  const trials = samples.flatMap((sample) =>
    sample.case === kind ? [sample.trial] : [],
  );

  return { case: kind, ...totals(trials), phases: phases(trials) };
}

export function runtimeSummary(
  samples: RuntimeSample[],
): ReturnType<typeof caseSummary>[] {
  return [...new Set(samples.map((sample) => sample.case))].map((kind) =>
    caseSummary(kind, samples),
  );
}

function failureMessage(trial: RuntimeTrial): string {
  return trial.error?.message ?? 'Milestone unavailable';
}

function phaseValue(trial: RuntimeTrial, metric: string): number | null {
  return trial.measurements[metric] ?? null;
}

function totals(
  trials: RuntimeTrial[],
): Pick<RuntimeCaseSummary, 'attempted' | 'completed' | 'failed' | 'timedOut'> {
  return {
    attempted: trials.length,
    completed: trials.filter((trial) => trial.status === 'completed').length,
    failed: trials.filter((trial) => trial.status === 'failed').length,
    timedOut: trials.filter((trial) => trial.status === 'timed-out').length,
  };
}

function phases(trials: RuntimeTrial[]): RuntimeCaseSummary['phases'] {
  const metrics = [
    ...new Set(trials.flatMap((trial) => Object.keys(trial.measurements))),
  ];

  return Object.fromEntries(
    metrics.map((metric) => [metric, phaseSummary(trials, metric)]),
  );
}
