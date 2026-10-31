import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  type AppFixtureAgents,
  appFixtureAgentIds,
} from '@repo/mocks/agent/app-fixtures';
import { startSeededServer } from './seed.mts';
import { writeReport } from './soak-report.mts';
import { soakFor } from './soak-run.mts';
import { type Soak, startSoak } from './soak-state.mts';

/*
 * PF-24: a soak of repeated navigation, scrolling, Turns and cancellations, with the same short
 * latency probe taken at the start and then at intervals, and the App's and the Server's resource
 * use sampled beside it. It declares no test unless PERF_SOAK_MINUTES is set, because it runs for
 * that long and a default run must not.
 *
 * It reports growth and latency over time. It does not decide that growth is a leak.
 */
const minutes = Number(process.env.PERF_SOAK_MINUTES ?? 0);

// Plays the shared reply for every prompt but the cancelling cycles' own, which it holds until Stop.
const cancellableAgents: AppFixtureAgents = Object.fromEntries(
  appFixtureAgentIds.map((agent) => [
    agent,
    { scenario: 'reply-or-hold' as const },
  ]),
);

let soak: Soak | undefined;

if (minutes > 0) {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'argo-soak-'));

    soak = startSoak(
      await startSeededServer(directory, undefined, cancellableAgents),
      minutes,
    );
  });

  test.afterAll(async () => {
    if (!soak) return;
    await soak.server.stop();
    await writeReport(soak);
  });

  test(`soak for ${minutes} minutes`, async ({ page }) => {
    // The soak is its own duration, plus room to start and to finish its last cycle.
    test.setTimeout((minutes + 10) * 60_000);
    expect(soak, 'The soak Server started').toBeDefined();

    if (soak) await soakFor(page, soak);

    expect(soak?.activity.cycles, 'At least one cycle ran').toBeGreaterThan(0);
  });
}
