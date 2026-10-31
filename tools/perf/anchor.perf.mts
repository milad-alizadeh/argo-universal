import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import {
  type AnchorTrial,
  anchorScenario,
  anchorTrial,
  openAnchorPage,
  throttled,
} from './anchor-drift.mts';
import {
  type AnchorResult,
  anchorSuite,
  reportAnchor,
} from './anchor-report.mts';
import { keepResult } from './kept-results.mts';
import { plannedCases } from './results.mts';
import { type PerfCase, caseName } from './run-completeness.mts';
import { type SeededServer, startSeededServer } from './seed.mts';

/*
 * PF-18, anchor stability: while the reader reads back and an older page of history lands, how far
 * does the row they are looking at move? Each trial opens the long Session from cold, reads back to
 * a screen below its oldest loaded row, marks the row at the middle of the view, lets the older page
 * land and watches the row every frame for two seconds beyond.
 *
 * It reports the drift. It states no budget: #1555 and #1543 fixed real drift, and this measures
 * whether any is left, not whether it is small enough.
 */
const runs = Number(process.env.PERF_RUNS ?? 3);

let server: SeededServer;

test.describe.configure({ mode: 'default' });

test.beforeAll(async () => {
  server = await startSeededServer(
    await mkdtemp(path.join(os.tmpdir(), 'argo-anchor-')),
  );
});

test.afterAll(async () => {
  await server.stop();
  await reportAnchor(planned);
});

const tooShort = 'The 100-row tier fits in the initial App history page';

// A tier whose whole Feed fits the first page has no older page to land.
const trialsOf = async (page: Page): Promise<AnchorTrial[]> => {
  const hold = await openAnchorPage(page, server);
  const trials: AnchorTrial[] = [];

  for (let index = 0; index < runs; index += 1)
    trials.push(await anchorTrial(page, server, hold));

  return trials;
};

async function measureCase(
  page: Page,
  planCase: PerfCase,
): Promise<AnchorTrial[]> {
  const trials: AnchorTrial[] = [];
  const result: AnchorResult = { ...planCase, trials };

  if (server.requested.feedRows === 100) result.notApplicable = tooShort;
  else
    trials.push(...(await throttled(page, planCase.cpu, () => trialsOf(page))));

  await keepResult(anchorSuite, caseName(planCase), result);

  return trials;
}

const planned = plannedCases([anchorScenario]);

for (const planCase of planned)
  test(caseName(planCase), async ({ page }) => {
    expect(
      (await measureCase(page, planCase)).filter(
        ({ status }) => status === 'failed',
      ),
      'Failed trials remain in the raw report',
    ).toEqual([]);
  });
