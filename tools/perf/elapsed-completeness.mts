import type { ElapsedResult } from './elapsed-results.mts';
import {
  caseName,
  runCompleteness,
  type RunCompleteness,
} from './run-completeness.mts';

// A trial that produced no sample measured nothing, whatever else its result records about it.
const sampled = (results: readonly ElapsedResult[]): string[] =>
  results.flatMap((result) =>
    result.samples.length ? [caseName(result)] : [],
  );

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
    measured: sampled(results),
    notApplicable: inapplicable(results),
  });
