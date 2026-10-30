import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { elapsedCompleteness } from './elapsed-completeness.mts';
import { type ElapsedSample, summarizeElapsed } from './elapsed.mts';
import {
  completenessNotice,
  type RunCompleteness,
} from './run-completeness.mts';
import type { RowKindCounts } from './seed-statistics.mts';
import type { UiObservation } from './ui-observation.mts';

export interface ObservedTrial {
  driver: ElapsedSample;
  browser?: UiObservation;
}

export interface ElapsedResult {
  interaction: string;
  cpu: number;
  condition: 'warm' | 'document-reload' | 'cold-cache' | 'server-restart';
  boundary: string;
  // Timed on the driver's clock alone, so there is no browser observation to summarise.
  driverOnly?: true;
  notApplicable?: string;
  warmups: ObservedTrial[];
  samples: ObservedTrial[];
}

export interface BenchmarkMetadata {
  commit: string;
  build: {
    kind: 'production-web-export';
    sha256: string;
    files: number;
    bytes: number;
  };
  track: 'controlled-rendering';
  dataset: {
    sessions: number;
    feedRows: number;
    shortFeedRows?: number;
    requestedSessions?: number;
    requestedFeedRows?: number | null;
    rowKinds?: RowKindCounts;
    content: string;
    attachments: string;
  };
  requestedSamples: number;
  requestedWarmups: number;
}

function browserSample(
  { browser, driver }: ObservedTrial,
  metric: 'firstReadyMs' | 'settledMs',
): ElapsedSample {
  if (driver.status !== 'completed') return driver;

  if (browser) return { status: 'completed', elapsedMs: browser[metric] };

  return {
    status: 'failed',
    phase: 'ready',
    elapsedMs: null,
    error: 'No browser observation recorded',
  };
}

type Summary = ReturnType<typeof summarizeElapsed>;

interface ElapsedReport extends ElapsedResult {
  summary: {
    driver: Summary;
    browserFirstReady?: Summary;
    browserSettled?: Summary;
  };
}

interface SummaryRow
  extends Summary, Pick<ElapsedResult, 'interaction' | 'cpu' | 'condition'> {}

const summarized = (result: ElapsedResult): ElapsedReport => ({
  ...result,
  summary: {
    driver: summarizeElapsed(result.samples.map(({ driver }) => driver)),
    ...(!result.driverOnly && {
      browserFirstReady: summarizeElapsed(
        result.samples.map((sample) => browserSample(sample, 'firstReadyMs')),
      ),
      browserSettled: summarizeElapsed(
        result.samples.map((sample) => browserSample(sample, 'settledMs')),
      ),
    }),
  },
});

const clocks = {
  driver:
    'Node performance.now; command dispatch through observed readiness, including automation round trips',
  browser:
    'Browser performance.now; captured input event through readiness on rendering opportunities',
};

const readiness =
  'First matching DOM on a rendering opportunity; settled is ready geometry unchanged for three consecutive rendering opportunities. This does not prove physical display presentation.';

async function reportFile(): Promise<string> {
  const directory = process.env.PERF_OUT ?? path.join(os.tmpdir(), 'argo-perf');
  await mkdir(directory, { recursive: true });

  return path.join(
    directory,
    `${process.env.PERF_LABEL ?? 'current'}-elapsed.json`,
  );
}

const rows = (results: ElapsedReport[]): SummaryRow[] =>
  results.map(({ interaction, cpu, condition, summary }) => ({
    interaction,
    cpu,
    condition,
    ...(summary.browserSettled ?? summary.driver),
  }));

export interface ElapsedRun {
  results: readonly ElapsedResult[];
  // Every scenario the run set out to measure, named as its test is named.
  planned: readonly string[];
  metadata: BenchmarkMetadata;
}

function reportData(
  results: ElapsedReport[],
  run: RunCompleteness,
  metadata: BenchmarkMetadata,
): string {
  const date = new Date().toISOString();

  return JSON.stringify(
    { date, ...metadata, run, clocks, readiness, results },
    null,
    2,
  );
}

function print(file: string, reported: ElapsedReport[]): void {
  console.log(
    `Elapsed results: ${file}. Timing observations; no speed budget is asserted.`,
  );
  console.table(rows(reported));
}

/*
 * Retain unsuccessful trials; browser and driver clocks are never subtracted from one another.
 * A run that left a planned scenario unmeasured says so here and then fails, so no reader can
 * mistake the scenarios this file omits for scenarios that came back clean.
 */
export async function reportElapsed({
  results,
  planned,
  metadata,
}: ElapsedRun): Promise<void> {
  const file = await reportFile();
  const reported = results.map(summarized);
  const completeness = elapsedCompleteness(planned, results);

  await writeFile(file, reportData(reported, completeness, metadata));
  print(file, reported);
  console.log(completenessNotice(completeness));

  if (completeness.status === 'partial')
    throw new Error(completenessNotice(completeness));
}
