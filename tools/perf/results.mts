import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CDPSession, Page } from '@playwright/test';
import { measure } from './frames.mts';
import { medianRow } from './results-table.mts';
import {
  caseName,
  completenessNotice,
  type PerfCase,
  runCompleteness,
  type RunCompleteness,
} from './run-completeness.mts';
import { median, type Sample } from './sample.mts';
import { hotspots, trace } from './trace.mts';

// PERF_LABEL names the run (before, after-…); PERF_CPU lists CPU slowdowns; PERF_RUNS repeats each measurement; PERF_TRACE=1 saves one trace and PERF_PROFILE=1 one CPU profile per interaction; PERF_ONLY picks interactions; PERF_OUT is where results go.
const label = (): string => process.env.PERF_LABEL ?? 'current';

const cpuRates = (): number[] =>
  (process.env.PERF_CPU ?? '1,4').split(',').map(Number);

const runs = (): number => Number(process.env.PERF_RUNS ?? 3);

// An empty PERF_ONLY is no filter at all, not a filter that selects nothing.
const only = (): string[] =>
  (process.env.PERF_ONLY ?? '').split(',').filter(Boolean);

const outputDirectory = (): string =>
  process.env.PERF_OUT ?? path.join(os.tmpdir(), 'argo-perf');

const wanted = (interaction: string): boolean => {
  const chosen = only();

  return !chosen.length || chosen.includes(interaction);
};

/*
 * Every scenario the run intends to measure. A suite declares its tests from this same list, so
 * the plan a report is held to cannot drift from the tests the run actually queued.
 */
export const plannedCases = (
  interactions: readonly string[],
): readonly PerfCase[] =>
  cpuRates().flatMap((cpu) =>
    interactions.flatMap((interaction) =>
      wanted(interaction) ? [{ interaction, cpu }] : [],
    ),
  );

export interface Result {
  interaction: string;
  cpu: number;
  runs: Sample[];
  median: Sample;
  hotspots?: Record<string, number>;
}

export interface Measurement {
  interaction: string;
  cpu: number;
  session: CDPSession;
  page: Page;
  once: () => Promise<void>;
  // Reloading or otherwise resetting the page empties the frame recorder, so it happens out here.
  before?: () => Promise<void>;
}

const output = (file: string): string => path.join(outputDirectory(), file);

// Saves one full trace of `once`, and returns where the main thread spent its time.
async function traceOnce({
  interaction,
  cpu,
  session,
  once,
  before,
}: Measurement): Promise<Record<string, number>> {
  await before?.();
  const recorded = await trace(session, once);
  await writeFile(
    output(`${label()}-${interaction}-${cpu}x.trace.json`),
    recorded.raw,
  );

  return hotspots(recorded.events);
}

// Saves one sampled CPU profile of `once`.
async function profileOnce(measurement: Measurement): Promise<void> {
  const { interaction, cpu, session, once, before } = measurement;
  await before?.();
  await session.send('Profiler.enable');
  await session.send('Profiler.setSamplingInterval', { interval: 200 });
  await session.send('Profiler.start');
  await once();
  const { profile } = await session.send('Profiler.stop');
  const file = output(`${label()}-${interaction}-${cpu}x.cpuprofile`);
  await writeFile(file, JSON.stringify(profile));
}

async function samples({
  session,
  page,
  once,
  before,
}: Measurement): Promise<Sample[]> {
  const measured: Sample[] = [];

  for (let index = 0; index < runs(); index += 1) {
    await before?.();
    measured.push(await measure(page, session, once));
  }

  return measured;
}

async function screenshot(page: Page, interaction: string): Promise<void> {
  await mkdir(outputDirectory(), { recursive: true });
  await page.screenshot({ path: output(`${label()}-${interaction}.png`) });
}

// The optional trace and profile of one more pass.
async function extras(
  measurement: Measurement,
): Promise<Pick<Result, 'hotspots'>> {
  if (process.env.PERF_PROFILE === '1') await profileOnce(measurement);

  return process.env.PERF_TRACE === '1'
    ? { hotspots: await traceOnce(measurement) }
    : {};
}

// Measures `once` `runs` times at the CPU slowdown, plus an optional trace and profile, and keeps the result.
export async function run(measurement: Measurement): Promise<Result> {
  const { interaction, cpu, session, page } = measurement;
  await screenshot(page, interaction);
  await session.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const measured = await samples(measurement);
  const more = await extras(measurement);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  return {
    interaction,
    cpu,
    runs: measured,
    median: median(measured),
    ...more,
  };
}

export interface FrameReport {
  results: readonly Result[];
  // Every scenario the run set out to measure, from `plannedCases`.
  planned: readonly PerfCase[];
  seeded: Record<string, number>;
  suite?: string;
}

const reportData = (
  run: RunCompleteness,
  { results, seeded }: FrameReport,
): string =>
  JSON.stringify(
    { label: label(), date: new Date().toISOString(), run, ...seeded, results },
    null,
    2,
  );

/*
 * Writes every result to `<label>.json`, or `<label>-<suite>.json`, prints their medians, and
 * fails the run when a planned scenario produced no measurement: a report that quietly omits a
 * scenario reads as a clean one, and its absent numbers as measured.
 */
export async function report(frames: FrameReport): Promise<void> {
  const { results, planned, suite } = frames;

  const file = output(suite ? `${label()}-${suite}.json` : `${label()}.json`);

  const run = runCompleteness(planned.map(caseName), {
    measured: results.map(caseName),
  });

  await mkdir(outputDirectory(), { recursive: true });
  await writeFile(file, reportData(run, frames));
  console.log(`\nResults: ${file}`);
  console.table(results.map(medianRow));
  console.log(completenessNotice(run));

  if (run.status === 'partial') throw new Error(completenessNotice(run));
}
