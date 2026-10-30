import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { reportElapsed } from './elapsed-results.mts';
import { metadata, measured } from './elapsed-results.test.mocks.mts';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'argo-elapsed-report-'));
  vi.stubEnv('PERF_OUT', directory);
  vi.stubEnv('PERF_LABEL', 'report-regression');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

const summary = z.object({
  attempted: z.number(),
  completed: z.number(),
  failed: z.number(),
  timedOut: z.number(),
  p50Ms: z.number().nullable(),
  p95Ms: z.number().optional(),
  maxMs: z.number().nullable(),
});

const reportSchema = z.object({
  commit: z.string(),
  build: z.object({ sha256: z.string() }),
  requestedSamples: z.number(),
  results: z.array(
    z.object({
      samples: z.array(z.unknown()),
      summary: z.object({
        driver: summary,
        browserFirstReady: summary,
        browserSettled: summary,
      }),
    }),
  ),
});

const planned = ['composer-type-ready at 1x CPU'];

it('persists distinct browser and driver samples, failures and build identity', async () => {
  await reportElapsed({ results: [measured], planned, metadata });

  const data = reportSchema.parse(
    JSON.parse(
      await readFile(
        path.join(directory, 'report-regression-elapsed.json'),
        'utf8',
      ),
    ),
  );

  expect(data).toMatchObject({
    commit: 'tested-commit',
    build: { sha256: 'served-export' },
    requestedSamples: 2,
  });
  expect(data.results[0]?.samples).toEqual(measured.samples);
  expect(data.results[0]?.summary).toEqual({
    driver: {
      attempted: 2,
      completed: 1,
      failed: 0,
      timedOut: 1,
      p50Ms: 100,
      maxMs: 100,
    },
    browserFirstReady: {
      attempted: 2,
      completed: 1,
      failed: 0,
      timedOut: 1,
      p50Ms: 7,
      maxMs: 7,
    },
    browserSettled: {
      attempted: 2,
      completed: 1,
      failed: 0,
      timedOut: 1,
      p50Ms: 20,
      maxMs: 20,
    },
  });
});

it('does not substitute a driver interval when a browser observation is missing', async () => {
  await reportElapsed({
    results: [
      {
        ...measured,
        samples: [{ driver: { status: 'completed', elapsedMs: 100 } }],
      },
    ],
    planned,
    metadata,
  });

  const data = reportSchema.parse(
    JSON.parse(
      await readFile(
        path.join(directory, 'report-regression-elapsed.json'),
        'utf8',
      ),
    ),
  );

  expect(data.results[0]?.summary.browserSettled).toEqual({
    attempted: 1,
    completed: 0,
    failed: 1,
    timedOut: 0,
    p50Ms: null,
    maxMs: null,
  });
});
