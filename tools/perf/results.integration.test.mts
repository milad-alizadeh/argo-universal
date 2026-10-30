import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { report } from './frame-report.mts';
import { keepFrameResult, plannedCases, type Result } from './results.mts';
import { sample } from './results.test.mocks.mts';
import { writtenRun, type WrittenRun } from './run-completeness.test.mocks.mts';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'argo-perf-report-'));
  vi.stubEnv('PERF_OUT', directory);
  vi.stubEnv('PERF_LABEL', 'completeness');
  vi.stubEnv('PERF_CPU', '1');
  vi.stubEnv('PERF_RUN_ID', 'run');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

const written = (): Promise<WrittenRun> =>
  writtenRun(directory, 'completeness.json');

const measured = (interaction: string): Result => ({
  interaction,
  cpu: 1,
  runs: [sample],
  median: sample,
});

const sidebar = 'sidebar at 1x CPU';

const sessions = 'sessions at 1x CPU';

const retry = /INCOMPLETE RUN/u;

const seeded = { sessions: 241 };

const keep = async (...interactions: string[]): Promise<void> => {
  for (const interaction of interactions)
    await keepFrameResult(measured(interaction));
};

it('marks a report whose scenarios all ran as complete', async () => {
  await keep('sidebar', 'sessions');
  await report({
    planned: plannedCases(['sidebar', 'sessions']),
    seeded,
  });

  expect(await written()).toMatchObject({
    status: 'complete',
    planned: [sidebar, sessions],
    missing: [],
  });
});

it('records the scenarios that never ran instead of reporting a partial run as whole', async () => {
  await keep('sidebar');
  await expect(
    report({
      planned: plannedCases(['sidebar', 'sessions', 'drawer']),
      seeded,
    }),
  ).rejects.toThrow(retry);

  expect(await written()).toMatchObject({
    status: 'partial',
    measured: [sidebar],
    missing: [sessions, 'drawer at 1x CPU'],
  });
});

it('fails the run that wrote a partial report, so nothing reads it as a measurement', async () => {
  await keep('sidebar');
  await expect(
    report({
      planned: plannedCases(['sidebar', 'drawer']),
      seeded,
    }),
  ).rejects.toThrow(/INCOMPLETE RUN[\s\S]*drawer at 1x CPU/u);
});

it('keeps what an earlier worker measured when a later worker reports after a failed scenario', async () => {
  const planned = plannedCases(['sidebar', 'sessions', 'drawer', 'feed']);
  // Worker one measures two scenarios, then drawer fails and Playwright restarts the worker.
  await keep('sidebar', 'sessions');
  await expect(report({ planned, seeded })).rejects.toThrow(retry);
  // Worker two has empty memory, measures feed, and reports last.
  await keep('feed');
  await expect(report({ planned, seeded })).rejects.toThrow(retry);

  expect(await written()).toMatchObject({
    status: 'partial',
    measured: ['feed at 1x CPU', sessions, sidebar],
    missing: ['drawer at 1x CPU'],
  });
});

it('plans only the scenarios PERF_ONLY names, so a narrowed run is complete on its own terms', () => {
  vi.stubEnv('PERF_ONLY', 'sessions');

  expect(plannedCases(['sidebar', 'sessions'])).toEqual([
    { interaction: 'sessions', cpu: 1 },
  ]);
});
