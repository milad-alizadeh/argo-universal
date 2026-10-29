import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type ElapsedSample, summarizeElapsed } from './elapsed.mts';
import type { RowKindCounts } from './seed-statistics.mts';
import type { UiObservation } from './ui-observation.mts';

export interface ObservedTrial {
  driver: ElapsedSample;
  browser?: UiObservation;
}

export interface ElapsedResult {
  interaction: string;
  cpu: number;
  condition: 'warm' | 'document-reload';
  boundary: string;
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
    browserFirstReady: Summary;
    browserSettled: Summary;
  };
}

interface SummaryRow
  extends Summary, Pick<ElapsedResult, 'interaction' | 'cpu' | 'condition'> {}

const summarized = (result: ElapsedResult): ElapsedReport => ({
  ...result,
  summary: {
    driver: summarizeElapsed(result.samples.map(({ driver }) => driver)),
    browserFirstReady: summarizeElapsed(
      result.samples.map((sample) => browserSample(sample, 'firstReadyMs')),
    ),
    browserSettled: summarizeElapsed(
      result.samples.map((sample) => browserSample(sample, 'settledMs')),
    ),
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
    ...summary.browserSettled,
  }));

function reportData(
  results: ElapsedReport[],
  metadata: BenchmarkMetadata,
): string {
  return JSON.stringify(
    { date: new Date().toISOString(), ...metadata, clocks, readiness, results },
    null,
    2,
  );
}

// Retain unsuccessful trials; browser and driver clocks are never subtracted from one another.
export async function reportElapsed(
  results: ElapsedResult[],
  metadata: BenchmarkMetadata,
): Promise<void> {
  const file = await reportFile();
  const reported = results.map(summarized);

  await writeFile(file, reportData(reported, metadata));
  console.log(
    `Elapsed results: ${file}. Timing observations; no speed budget is asserted.`,
  );
  console.table(rows(reported));
}
