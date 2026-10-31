import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { report } from './frame-report.mts';
import { renderingManifest, type RenderingManifest } from './manifest.mts';
import {
  desktop,
  feedScroll,
  openApp,
  type Scenario,
  scrollDownAndUp,
} from './page.mts';
import {
  environmentRealAgent,
  type RealAgentChoice,
} from './real-agent-choice.mts';
import {
  noOutputFailure,
  type OutputRate,
  outputRate,
} from './real-agent-output.mts';
import { startRealAgentServer } from './real-agent-seed.mts';
import { pinBeforePrompting, sessionRevision } from './real-agent-session.mts';
import { keepFrameResult, plannedCases, type Result, run } from './results.mts';
import { caseName } from './run-completeness.mts';
import { longSessionId } from './seed-sessions.mts';
import type { SeededServer } from './seed.mts';

/*
 * PF-17, scroll during live output, against a real Agent.
 *
 * What this measures: the Feed's frame timings while an Agent the owner is signed in to streams its
 * answer, with the reader flicking back and forth through the Session's history as it arrives. The
 * `streaming` scenario in `interactions.perf.mts` cannot stand in for this. It replays a scripted
 * fixture at a fixed rate and never scrolls, and the fixture's rate is precisely the variable PF-17
 * exists to measure against.
 *
 * What it asserts: that frames were measured, and that the Agent streamed something while they
 * were. It asserts no budget. A real Agent's output rate is not reproducible, so a fixed budget
 * would fail a slow provider for a reason that has nothing to do with the App; the rate each pass
 * saw is recorded as a condition of the run instead, beside the build and the machine.
 *
 * What it costs: `PERF_AGENT` names the Agent and `PERF_AGENT_OPTIONS` the options it is pinned to.
 * Neither has a default, and the pin is read back from the Agent's own options before anything is
 * prompted. Every pass sends one one-line prompt, and the warm-up pass sends one more, so a run
 * sends `(1 + PERF_RUNS)` prompts per CPU slowdown.
 *
 * What it does not measure, of PF-17's four: stream presentation delay, typing latency during
 * output, and movement of the reading anchor. The anchor has its own instrument in
 * `anchor.perf.mts`, against a paged Feed rather than a streaming one.
 */

const scenarioName = 'live-scroll';

const suite = 'real-agent';

// One line, and enough output to still be arriving after several flicks through the Feed.
const livePrompt = 'List the numbers from 1 to 150, one per line.';

// Enough of the prompt to find its own row in the Feed, however the row wraps or truncates it.
const promptEcho = 'List the numbers from 1 to 150';

// Far longer than this prompt takes, even at the heaviest CPU slowdown.
const turnTimeoutMilliseconds = 180_000;

// Long enough for the rows the Session opens on to measure.
const feedSettleMilliseconds = 1500;

const choice = environmentRealAgent();

let server: SeededServer;

let manifest: RenderingManifest;

// What each measured pass saw arrive, in the order the passes ran.
const rates: OutputRate[] = [];

const planned = choice ? plannedCases([scenarioName]) : [];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  if (!choice) return;
  server = await startRealAgentServer(
    choice,
    await mkdtemp(path.join(os.tmpdir(), 'argo-perf-real-agent-')),
  );
  manifest = await renderingManifest(server.agent);
  console.log(
    `Seeded ${server.sessionCount} Sessions and ${server.feedRowCount} Feed rows against ${server.agent}`,
  );
});

test.afterAll(async () => {
  if (!server) return;
  await server.stop();
  await report({
    planned,
    suite,
    seeded: {
      sessions: server.sessionCount,
      feedRows: server.feedRowCount,
      feedContent: server.requested.feedContent ?? 'recorded',
    },
    conditions: { ...manifest, prompt: livePrompt, output: rates },
  });
});

const stopButton = (page: Page): ReturnType<Page['getByRole']> =>
  page.getByRole('button', { name: 'Stop', exact: true });

/*
 * Sends the prompt and waits until the Turn is demonstrably running: Stop on screen, and the
 * prompt itself in the Feed. Both have to be true before the window opens. Measuring from the
 * click would count the reader's own prompt row as output, so `rows > 0` would hold for a Turn
 * that streamed nothing; and flicking from the click can find Stop not yet rendered, which ends
 * the window before it began and measures a still Feed.
 */
async function turnUnderway(page: Page): Promise<void> {
  await stopButton(page).waitFor({
    state: 'visible',
    timeout: turnTimeoutMilliseconds,
  });
  await page
    .getByTestId(feedScroll)
    .getByText(promptEcho)
    .first()
    .waitFor({ timeout: turnTimeoutMilliseconds });
}

/*
 * Flicks the Feed for as long as the Turn is running, then stops: the measured window is the
 * streaming, not the still Feed after it. A flick pair outlasts a short Turn, so the window can
 * overrun the Turn's end by one pair, which the recorded rate accounts for.
 */
async function scrollWhileStreaming(page: Page): Promise<void> {
  const deadline = Date.now() + turnTimeoutMilliseconds;

  while ((await stopButton(page).isVisible()) && Date.now() < deadline)
    await scrollDownAndUp(page, feedScroll);

  await stopButton(page).waitFor({
    state: 'detached',
    timeout: turnTimeoutMilliseconds,
  });
}

// Sends one prompt, scrolls the Feed while the answer streams, and records what the Agent added.
async function scrollThroughOutput(
  page: Page,
  httpUrl: string,
): Promise<OutputRate> {
  const revisionBefore = await sessionRevision(httpUrl, longSessionId);
  const startedAt = Date.now();
  await scrollWhileStreaming(page);

  return outputRate({
    revisionBefore,
    revisionAfter: await sessionRevision(httpUrl, longSessionId),
    durationMs: Date.now() - startedAt,
  });
}

async function promptAndScroll(page: Page, httpUrl: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Message' }).fill(livePrompt);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await turnUnderway(page);

  const rate = await scrollThroughOutput(page, httpUrl);
  rates.push(rate);
  const failure = noOutputFailure(rate);

  if (failure) throw new Error(failure);
}

const liveScroll =
  (chosen: RealAgentChoice): Scenario =>
  async (page) => {
    const session = await openApp(page, {
      serverUrl: server.serverUrl,
      viewport: desktop,
      session: server.longSessionTitle,
    });

    await page.getByTestId(feedScroll).waitFor();
    await page.waitForTimeout(feedSettleMilliseconds);
    // Before the first prompt: the open Session, pinned and proved pinned.
    await pinBeforePrompting(server.httpUrl, chosen.pin, longSessionId);

    return { session, once: () => promptAndScroll(page, server.httpUrl) };
  };

async function measureScenario(
  page: Page,
  chosen: RealAgentChoice,
  cpu: number,
): Promise<Result> {
  const started = await liveScroll(chosen)(page);
  await started.once();

  return run({ ...started, page, interaction: scenarioName, cpu });
}

const declareScenarios = (chosen: RealAgentChoice): void => {
  for (const planCase of planned)
    test(caseName(planCase), async ({ page }) => {
      const result = await measureScenario(page, chosen, planCase.cpu);
      await keepFrameResult(result, suite);
      expect(result.median.fps).toBeGreaterThan(0);
    });
};

const declareNoAgent = (): void => {
  test('PF-17 needs a real Agent, which no PERF_AGENT named', () => {
    console.log(
      'Set PERF_AGENT to the Registry Agent to install and PERF_AGENT_OPTIONS to the options to pin it to. This suite never falls back to the scripted fixture: the fixture is not PF-17.',
    );
    expect(process.env.PERF_AGENT ?? '').toBe('');
  });
};

if (choice) declareScenarios(choice);
else declareNoAgent();
