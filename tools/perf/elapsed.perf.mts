import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import {
  type BenchmarkMetadata,
  type ElapsedResult,
  type ObservedTrial,
  reportElapsed,
} from './elapsed-results.mts';
import {
  type ElapsedScenario,
  readinessTimeout,
  repetitions,
  type ScenarioFactory,
  warmups,
} from './elapsed-scenario.mts';
import { runElapsed } from './elapsed-trial.mts';
import { expansion, typing, wheel } from './interaction-latency.mts';
import { renderingManifest, type RenderingManifest } from './manifest.mts';
import { desktop, feedScroll, sessionsScroll } from './page.mts';
import { cpuRates, wanted } from './results.mts';
import { type SeededServer, startSeededServer } from './seed.mts';
import { paging, sessionOpen } from './session-latency.mts';

const results: ElapsedResult[] = [];

let server: SeededServer;

let manifest: Awaited<ReturnType<typeof renderingManifest>>;

let browserVersion = '';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  manifest = await renderingManifest();
  browserVersion = browser.version();
  server = await startSeededServer(
    await mkdtemp(path.join(os.tmpdir(), 'argo-elapsed-')),
  );
});

interface RunMetadata
  extends BenchmarkMetadata, Omit<RenderingManifest, 'build'> {
  browserVersion: string;
  viewport: typeof desktop;
  readinessTimeoutMs: number;
}

const dataset = (): BenchmarkMetadata['dataset'] => ({
  sessions: server.sessionCount,
  feedRows: server.feedRowCount,
  shortFeedRows: server.shortFeedRowCount,
  requestedSessions: server.requested.sessions,
  requestedFeedRows: server.requested.feedRows ?? null,
  rowKinds: server.rowKinds,
  content:
    'Copies of mocks/app/feed-recordings.json excluding Blob rows; text, markdown and Tool calls',
  attachments: 'Excluded because the seeded Server does not hold their Blobs',
});

const metadata = (): RunMetadata => ({
  ...manifest,
  browserVersion,
  viewport: desktop,
  dataset: dataset(),
  requestedSamples: repetitions,
  requestedWarmups: warmups,
  readinessTimeoutMs: readinessTimeout,
});

type FailedTrial = Exclude<ObservedTrial['driver'], { status: 'completed' }> &
  Pick<ElapsedResult, 'interaction' | 'cpu'>;

const failedTrials = (result: ElapsedResult): FailedTrial[] =>
  [...result.warmups, ...result.samples].flatMap(({ driver }) =>
    driver.status === 'completed'
      ? []
      : [{ interaction: result.interaction, cpu: result.cpu, ...driver }],
  );

test.afterAll(async () => {
  if (!server) return;
  await server.stop();
  await reportElapsed(results, metadata());
});

const scenarios = {
  'session-open-warm': (page: Page): Promise<ElapsedScenario> =>
    sessionOpen(page, server, false),
  'session-open-reload': (page: Page): Promise<ElapsedScenario> =>
    sessionOpen(page, server, true),
  'feed-page-ready': (page: Page): Promise<ElapsedScenario> =>
    paging(page, server),
  'tool-expand-ready': (page: Page): Promise<ElapsedScenario> =>
    expansion(page, server),
  'feed-wheel-ready': (page: Page): Promise<ElapsedScenario> =>
    wheel(page, server, feedScroll),
  'sessions-wheel-ready': (page: Page): Promise<ElapsedScenario> =>
    wheel(page, server, sessionsScroll),
  'composer-type-ready': (page: Page): Promise<ElapsedScenario> =>
    typing(page, server),
} satisfies Record<string, ScenarioFactory>;

function datasetLimit(
  interaction: string,
): Pick<ElapsedResult, 'notApplicable'> {
  return interaction === 'feed-page-ready' && server.requested.feedRows === 100
    ? { notApplicable: 'The 100-row tier fits in the initial App history page' }
    : {};
}

function resultFor(
  interaction: string,
  cpu: number,
  scenario: ElapsedScenario,
): ElapsedResult {
  return {
    interaction,
    cpu,
    condition: scenario.condition,
    boundary: scenario.boundary,
    warmups: [],
    samples: [],
    ...datasetLimit(interaction),
  };
}

for (const cpu of cpuRates)
  for (const [interaction, factory] of Object.entries(scenarios).filter(
    ([name]) => wanted(name),
  ))
    test(`${interaction} at ${cpu}x CPU`, async ({ page }) => {
      const scenario = await factory(page);

      const result = resultFor(interaction, cpu, scenario);
      results.push(result);
      // The 100-row tier fits in the initial page, so it cannot measure older-history pagination.
      test.skip(result.notApplicable !== undefined, result.notApplicable);
      await runElapsed(page, scenario, result);
      expect(
        failedTrials(result),
        'Readiness failures remain in the raw report',
      ).toEqual([]);
    });
