import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { reportElapsed } from './elapsed-results.mts';
import { measured, metadata } from './elapsed-results.test.mocks.mts';
import { writtenRun, type WrittenRun } from './run-completeness.test.mocks.mts';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'argo-elapsed-run-'));
  vi.stubEnv('PERF_OUT', directory);
  vi.stubEnv('PERF_LABEL', 'run-completeness');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

const written = (): Promise<WrittenRun> =>
  writtenRun(directory, 'run-completeness-elapsed.json');

const typing = 'composer-type-ready at 1x CPU';

it('records the planned scenarios that produced no sample at all', async () => {
  await expect(
    reportElapsed({
      results: [measured],
      planned: [typing, 'feed-wheel-ready at 4x CPU'],
      metadata,
    }),
  ).rejects.toThrow(/INCOMPLETE RUN/u);

  expect(await written()).toMatchObject({
    status: 'partial',
    measured: [typing],
    missing: ['feed-wheel-ready at 4x CPU'],
  });
});

it('fails the run that wrote a partial elapsed report', async () => {
  await expect(
    reportElapsed({ results: [], planned: [typing], metadata }),
  ).rejects.toThrow(new RegExp(`INCOMPLETE RUN[\\s\\S]*${typing}`, 'u'));
});

it('does not call a scenario measured when every one of its trials failed', async () => {
  await expect(
    reportElapsed({
      results: [
        {
          ...measured,
          samples: [
            {
              driver: {
                status: 'timed-out',
                phase: 'ready',
                elapsedMs: 500,
                error: 'Text not drawn',
              },
            },
          ],
        },
      ],
      planned: [typing],
      metadata,
    }),
  ).rejects.toThrow(/INCOMPLETE RUN/u);

  expect(await written()).toMatchObject({
    status: 'partial',
    measured: [],
    missing: [typing],
  });
});

it('counts a scenario the dataset cannot exercise as accounted for, not missing', async () => {
  await reportElapsed({
    results: [
      {
        ...measured,
        interaction: 'feed-page-ready',
        warmups: [],
        samples: [],
        notApplicable: 'The 100-row tier fits in the initial App history page',
      },
    ],
    planned: ['feed-page-ready at 1x CPU'],
    metadata,
  });

  expect(await written()).toMatchObject({
    status: 'complete',
    notApplicable: ['feed-page-ready at 1x CPU'],
    missing: [],
  });
});
