import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { plannedCases, report, type Result } from './results.mts';
import { sample } from './results.test.mocks.mts';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'argo-perf-report-'));
  vi.stubEnv('PERF_OUT', directory);
  vi.stubEnv('PERF_LABEL', 'completeness');
  vi.stubEnv('PERF_CPU', '1');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

const reportSchema = z.object({
  run: z.object({
    status: z.enum(['complete', 'partial']),
    planned: z.array(z.string()),
    measured: z.array(z.string()),
    notApplicable: z.array(z.string()),
    missing: z.array(z.string()),
  }),
});

const written = async (): Promise<z.infer<typeof reportSchema>> =>
  reportSchema.parse(
    JSON.parse(
      await readFile(path.join(directory, 'completeness.json'), 'utf8'),
    ),
  );

const measured = (interaction: string): Result => ({
  interaction,
  cpu: 1,
  runs: [sample],
  median: sample,
});

const seeded = { sessions: 241 };

it('marks a report whose scenarios all ran as complete', async () => {
  await report({
    results: [measured('sidebar'), measured('sessions')],
    planned: plannedCases(['sidebar', 'sessions']),
    seeded,
  });

  expect((await written()).run).toMatchObject({
    status: 'complete',
    planned: ['sidebar at 1x CPU', 'sessions at 1x CPU'],
    missing: [],
  });
});

it('records the scenarios that never ran instead of reporting a partial run as whole', async () => {
  await expect(
    report({
      results: [measured('sidebar')],
      planned: plannedCases(['sidebar', 'sessions', 'drawer']),
      seeded,
    }),
  ).rejects.toThrow(/INCOMPLETE RUN/u);

  expect((await written()).run).toMatchObject({
    status: 'partial',
    measured: ['sidebar at 1x CPU'],
    missing: ['sessions at 1x CPU', 'drawer at 1x CPU'],
  });
});

it('fails the run that wrote a partial report, so nothing reads it as a measurement', async () => {
  await expect(
    report({
      results: [measured('sidebar')],
      planned: plannedCases(['sidebar', 'drawer']),
      seeded,
    }),
  ).rejects.toThrow(/INCOMPLETE RUN[\s\S]*drawer at 1x CPU/u);
});

it('plans only the scenarios PERF_ONLY names, so a narrowed run is complete on its own terms', () => {
  vi.stubEnv('PERF_ONLY', 'sessions');

  expect(plannedCases(['sidebar', 'sessions'])).toEqual([
    { interaction: 'sessions', cpu: 1 },
  ]);
});
