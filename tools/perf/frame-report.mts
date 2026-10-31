import { mkdir, writeFile } from 'node:fs/promises';
import { frameSuite, keptResults, outputDirectory } from './kept-results.mts';
import { medianRow } from './results-table.mts';
import { label, output, type Result } from './results.mts';
import {
  caseName,
  completenessNotice,
  type PerfCase,
  runCompleteness,
  type RunCompleteness,
} from './run-completeness.mts';

/*
 * A suite's recorded conditions, carried through to its report untouched. Every suite's conditions
 * are its own shape, so the report writes the object and never reads a key out of it.
 */
export type RunConditions = object;

export interface FrameReport {
  // Every scenario the run set out to measure, from `plannedCases`.
  planned: readonly PerfCase[];
  seeded: Record<string, number | string>;
  /*
   * What the run cannot hold constant and records instead: its build and machine, the Agent it
   * drove, and anything a scenario observed about its own conditions. A reader compares two reports
   * knowing these, rather than assuming they matched. A suite's own condition type is its own, so
   * this is the suite's object rather than a dictionary the report reaches into.
   */
  conditions?: RunConditions;
  suite?: string;
}

const reportData = (
  run: RunCompleteness,
  { seeded, conditions }: FrameReport,
  results: readonly Result[],
): string => {
  const date = new Date().toISOString();
  const recorded = conditions && { conditions };

  return JSON.stringify(
    { label: label(), date, run, ...seeded, ...recorded, results },
    null,
    2,
  );
};

const fileName = (suite?: string): string =>
  suite ? `${label()}-${suite}.json` : `${label()}.json`;

/*
 * Writes every result any worker of this run kept to `<label>.json`, or `<label>-<suite>.json`, prints their medians, and
 * fails the run when a planned scenario produced no measurement: a report that quietly omits a
 * scenario reads as a clean one, and its absent numbers as measured.
 */
export async function report(frames: FrameReport): Promise<void> {
  const { planned, suite } = frames;
  const results = await keptResults<Result>(suite ?? frameSuite);

  const file = output(fileName(suite));

  const completeness = runCompleteness(planned.map(caseName), {
    measured: results.map(caseName),
  });

  await mkdir(outputDirectory(), { recursive: true });
  await writeFile(file, reportData(completeness, frames, results));
  console.log(`\nResults: ${file}`);
  console.table(results.map(medianRow));
  console.log(completenessNotice(completeness));

  if (completeness.status === 'partial')
    throw new Error(completenessNotice(completeness));
}
