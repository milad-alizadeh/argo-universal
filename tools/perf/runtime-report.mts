import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runCompleteness, type RunCompleteness } from './run-completeness.mts';
import type { runtimeMetadata } from './runtime-metadata.mts';
import type { RuntimeCase } from './runtime-options.mts';
import { runtimeSummary } from './runtime-summary.mts';
import type { RuntimeTrial } from './runtime-types.mts';

export interface RuntimeSample {
  case: RuntimeCase;
  trial: RuntimeTrial;
}

export interface RuntimeReport {
  metadata: Awaited<ReturnType<typeof runtimeMetadata>>;
  clock: {
    source: 'Node performance.now';
    timeOriginUnixMs: number;
    startedAt: string;
  };
  requested: RuntimeDemand & { warmups: number };
  warmups: RuntimeSample[];
  samples: RuntimeSample[];
}

export interface RuntimeDemand {
  runs: number;
  cases: readonly RuntimeCase[];
}

/*
 * A case is measured only once it has every sample the run asked for. A run that stopped part way
 * leaves a case short, and a short case is a gap the report has to name rather than a result.
 * A failed or timed-out trial is a sample taken: the report records what happened to it.
 */
export const runtimeCompleteness = (
  { runs, cases }: RuntimeDemand,
  recorded: readonly RuntimeCase[],
): RunCompleteness =>
  runCompleteness(cases, {
    measured: cases.filter(
      (kind) => recorded.filter((taken) => taken === kind).length >= runs,
    ),
  });

const reportData = (report: RuntimeReport): string =>
  JSON.stringify(
    {
      ...report,
      run: runtimeCompleteness(
        report.requested,
        report.samples.map((sample) => sample.case),
      ),
      summary: runtimeSummary(report.samples),
    },
    null,
    2,
  );

// Save after every trial, including a failure or timeout; warmups never enter the measured summaries.
export async function writeRuntimeReport(
  file: string,
  report: RuntimeReport,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, reportData(report));
}
