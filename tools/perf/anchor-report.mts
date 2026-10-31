import { mkdir, writeFile } from 'node:fs/promises';
import type { AnchorTrial } from './anchor-drift.mts';
import { keptResults, outputDirectory } from './kept-results.mts';
import { label, output } from './results.mts';
import {
  caseName,
  completenessNotice,
  type PerfCase,
  runCompleteness,
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

const middle = (values: number[]): number => {
  const sorted = values.toSorted((a, b) => a - b);

  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const summary = (result: AnchorResult) => {
  const good = measured(result);
  const column = (pick: (trial: Measured) => number): number[] =>
    good.map(pick);

  return {
    trials: result.trials.length,
    measured: good.length,
    anchorLost: good.filter((trial) => !trial.anchorKept).length,
    endReached: good.filter((trial) => trial.endReached).length,
    maxDriftPxMedian: middle(column((trial) => trial.maxDriftPx)),
    maxDriftPxWorst: Math.max(0, ...column((trial) => trial.maxDriftPx)),
    finalDriftPxMedian: middle(column((trial) => trial.finalDriftPx)),
    extentGrowthPxMedian: middle(column((trial) => trial.extentGrowthPx)),
  };
};

/*
 * Writes every result this run kept to `<label>-anchor.json` and prints the drift of each. The drift is
 * a measurement, not a verdict: no budget is asserted. A planned scenario with no measured trial fails
 * the run, as it does in the other suites.
 */
export async function reportAnchor(
  planned: readonly PerfCase[],
): Promise<void> {
  const results = await keptResults<AnchorResult>(anchorSuite);

  const completeness = runCompleteness(planned.map(caseName), {
    measured: results
      .filter((result) => measured(result).length > 0)
      .map(caseName),
    notApplicable: results
      .filter(({ notApplicable }) => notApplicable)
      .map(caseName),
  });

  const file = output(`${label()}-anchor.json`);
  await mkdir(outputDirectory(), { recursive: true });
  await writeFile(
    file,
    JSON.stringify(
      {
        label: label(),
        date: new Date().toISOString(),
        run: completeness,
        results: results.map((result) => ({
          ...result,
          summary: summary(result),
        })),
      },
      null,
      2,
    ),
  );
  console.log(
    `\nAnchor results: ${file}. Drift is measured; no budget is asserted.`,
  );
  console.table(
    results.map((result) => ({
      scenario: caseName(result),
      ...summary(result),
    })),
  );
  console.log(completenessNotice(completeness));

  if (completeness.status === 'partial')
    throw new Error(completenessNotice(completeness));
}
