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

export interface FrameReport {
  // Every scenario the run set out to measure, from `plannedCases`.
  planned: readonly PerfCase[];
  seeded: Record<string, number>;
  suite?: string;
}

const reportData = (
  run: RunCompleteness,
  { seeded }: FrameReport,
  results: readonly Result[],
): string =>
  JSON.stringify(
    { label: label(), date: new Date().toISOString(), run, ...seeded, results },
    null,
    2,
  );

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
