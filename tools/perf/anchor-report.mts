import { mkdir, writeFile } from 'node:fs/promises';
import type { AnchorTrial } from './anchor-drift.mts';
import { keptResults, outputDirectory } from './kept-results.mts';
import { label, output } from './results.mts';
import {
  caseName,
  completenessNotice,
  type PerfCase,
  runCompleteness,
  type RunCompleteness,
} from './run-completeness.mts';

// The suite anchor results are kept under.
export const anchorSuite = 'anchor';

export interface AnchorResult extends PerfCase {
  trials: AnchorTrial[];
  // Why the dataset cannot exercise this scenario, when it cannot.
  notApplicable?: string;
}

type Measured = Extract<AnchorTrial, { status: 'measured' }>;

const measured = ({ trials }: AnchorResult): Measured[] =>
  trials.filter((trial): trial is Measured => trial.status === 'measured');

const median = (values: number[]): number =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

interface AnchorSummary {
  trials: number;
  measured: number;
  anchorLost: number;
  endReached: number;
  maxDriftPxMedian: number;
  maxDriftPxWorst: number;
  driftedFramesMedian: number;
  finalDriftPxMedian: number;
  extentGrowthPxMedian: number;
}

const columnOf = (
  result: AnchorResult,
  pick: (trial: Measured) => number,
): number[] => measured(result).map(pick);

const countOf = (
  result: AnchorResult,
  has: (trial: Measured) => boolean,
): number => measured(result).filter(has).length;

const counts = (
  result: AnchorResult,
): Pick<
  AnchorSummary,
  'trials' | 'measured' | 'anchorLost' | 'endReached'
> => ({
  trials: result.trials.length,
  measured: measured(result).length,
  anchorLost: countOf(result, (trial) => !trial.anchorKept),
  endReached: countOf(result, (trial) => trial.endReached),
});

const medianOf = (
  result: AnchorResult,
  pick: (trial: Measured) => number,
): number => median(columnOf(result, pick));

function medians(
  result: AnchorResult,
): Omit<AnchorSummary, keyof ReturnType<typeof counts>> {
  const drift = columnOf(result, (trial) => trial.maxDriftPx);

  return {
    maxDriftPxMedian: median(drift),
    maxDriftPxWorst: Math.max(0, ...drift),
    driftedFramesMedian: medianOf(result, (trial) => trial.driftedFrames),
    finalDriftPxMedian: medianOf(result, (trial) => trial.finalDriftPx),
    extentGrowthPxMedian: medianOf(result, (trial) => trial.extentGrowthPx),
  };
}

const summary = (result: AnchorResult): AnchorSummary => ({
  ...counts(result),
  ...medians(result),
});

const namesWhere = (
  results: readonly AnchorResult[],
  has: (result: AnchorResult) => boolean,
): string[] =>
  results.flatMap((result) => (has(result) ? [caseName(result)] : []));

const completeness = (
  planned: readonly PerfCase[],
  results: readonly AnchorResult[],
): RunCompleteness =>
  runCompleteness(planned.map(caseName), {
    measured: namesWhere(results, (result) => measured(result).length > 0),
    notApplicable: namesWhere(results, ({ notApplicable }) => !!notApplicable),
  });

const summarized = (results: readonly AnchorResult[]): object[] =>
  results.map((result) => ({ ...result, summary: summary(result) }));

const reportData = (
  run: RunCompleteness,
  results: readonly AnchorResult[],
): string => {
  const date = new Date().toISOString();

  return JSON.stringify(
    { label: label(), date, run, results: summarized(results) },
    null,
    2,
  );
};

function print(file: string, results: readonly AnchorResult[]): void {
  console.log(
    `\nAnchor results: ${file}. Drift is measured; no budget is asserted.`,
  );
  console.table(
    results.map((result) => ({
      scenario: caseName(result),
      ...summary(result),
    })),
  );
}

/*
 * Writes every result this run kept to `<label>-anchor.json` and prints the drift of each. The drift is
 * a measurement, not a verdict: no budget is asserted. A planned scenario with no measured trial fails
 * the run, as it does in the other suites.
 */
export async function reportAnchor(
  planned: readonly PerfCase[],
): Promise<void> {
  const results = await keptResults<AnchorResult>(anchorSuite);
  const run = completeness(planned, results);
  const file = output(`${label()}-anchor.json`);

  await mkdir(outputDirectory(), { recursive: true });
  await writeFile(file, reportData(run, results));
  print(file, results);
  console.log(completenessNotice(run));

  if (run.status === 'partial') throw new Error(completenessNotice(run));
}
