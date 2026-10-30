import type { ElapsedResult } from './elapsed-results.mts';
import {
  caseName,
  runCompleteness,
  type RunCompleteness,
} from './run-completeness.mts';

/*
 * A scenario measured something only once one of its trials completed. No sample at all, or
 * nothing but failures and timeouts, leaves it with no timing, and `measured` must never name a
 * scenario whose numbers a reader would then go looking for.
 */
const timed = (result: ElapsedResult): boolean =>
  result.samples.some(({ driver }) => driver.status === 'completed');

const measuredNames = (results: readonly ElapsedResult[]): string[] =>
  results.flatMap((result) => (timed(result) ? [caseName(result)] : []));

// A scenario the dataset cannot exercise carries its own reason, so it is accounted for, not missing.
const inapplicable = (results: readonly ElapsedResult[]): string[] =>
  results.flatMap((result) =>
    result.notApplicable === undefined ? [] : [caseName(result)],
  );

export const elapsedCompleteness = (
  planned: readonly string[],
  results: readonly ElapsedResult[],
): RunCompleteness =>
  runCompleteness(planned, {
    measured: measuredNames(results),
    notApplicable: inapplicable(results),
  });
