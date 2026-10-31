import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type CDPSession, expect, type Page, test } from '@playwright/test';
import { startOwnServer } from '@repo/e2e/own-server';
import { longRegistry, requireServedCatalog } from './agents-registry.mts';
import { report } from './frame-report.mts';
import {
  desktop,
  jump,
  openApp,
  phone,
  scrollDownAndUp,
  type Viewport,
} from './page.mts';
import { keepFrameResult, plannedCases, run } from './results.mts';
import { caseName } from './run-completeness.mts';

const catalogScroll = 'agents-catalog';

const settleMilliseconds = 1000;

type Server = Awaited<ReturnType<typeof startOwnServer>>;

let server: Server;

// Unset until the Server has been asked, so a run that fails before that publishes no count rather than a zero.
let seededAgents: number | undefined;

/*
 * The Agents page lists the catalog in name order (`byName`, installed-agents.ts, applied in
 * agent-rows.ts), and none of these
 * Agents is installed, so nothing is lifted above it. The rows that prove the catalog arrived and
 * that the list has been reached to its end are therefore the first and last names, not the first
 * and last entries: "Binary Agent 103" sorts before "Binary Agent 11", and 200 is nowhere near last.
 */
const catalogOrder = longRegistry()
  .agents.map(({ name }) => name)
  .toSorted((left, right) => left.localeCompare(right));

// An empty name would build the regex `^, v`, which matches some other Agent's card and passes.
const namedAt = (index: number): string => {
  const name = catalogOrder.at(index);

  if (!name) throw new Error(`The long registry has no Agent at ${index}`);

  return name;
};

const firstAgent = namedAt(0);

const lastAgent = namedAt(-1);

// Not serial: one scenario's failure must not silently void the scenarios queued behind it.
test.describe.configure({ mode: 'default' });

/*
 * The long registry goes in as the Server's own registry, not over it afterwards: the Engine reads
 * the file as it starts, so a write that lands later is never the catalog the scenario measures.
 */
test.beforeAll(async () => {
  server = await startOwnServer(
    await mkdtemp(path.join(os.tmpdir(), 'argo-perf-agents-')),
    {},
    { registry: longRegistry() },
  );
  seededAgents = await requireServedCatalog(server.httpUrl);
});

test.afterAll(async () => {
  await server.stop();
  await report({
    planned,
    seeded: seededAgents === undefined ? {} : { agents: seededAgents },
    suite: 'agents',
  });
});

// An Agent's card is a group, named by the label the Agents page gives it: name, version, description.
const agentCard = (page: Page, name: string): ReturnType<Page['getByRole']> =>
  page.getByRole('group', { name: new RegExp(`^${name}, v`, 'u') });

// Opens Settings, then Agents, and waits for the long registry's rows.
async function openAgents(page: Page, viewport: Viewport): Promise<CDPSession> {
  const session = await openApp(page, {
    serverUrl: server.serverUrl,
    viewport,
  });

  if (viewport.width < 600)
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: /^Agents(?:,|$)/u }).click();
  await agentCard(page, firstAgent).waitFor();

  return session;
}

// Reaches the last Agent once, so the list has measured every row before the flicks.
async function warmList(page: Page): Promise<void> {
  await jump(page, catalogScroll, false);
  await agentCard(page, lastAgent).waitFor();
  await jump(page, catalogScroll, true);
  await page.waitForTimeout(settleMilliseconds);
}

const viewports = new Map<string, Viewport>([
  ['agents', desktop],
  ['agents-phone', phone],
]);

function viewportFor(interaction: string): Viewport {
  const viewport = viewports.get(interaction);

  if (!viewport) throw new Error(`No ${interaction} viewport`);

  return viewport;
}

// The scenarios this run owes a measurement for, and the tests that owe them, from one list.
const planned = plannedCases([...viewports.keys()]);

for (const planCase of planned)
  test(caseName(planCase), async ({ page }) => {
    const { interaction, cpu } = planCase;
    const session = await openAgents(page, viewportFor(interaction));
    await warmList(page);
    const once = (): Promise<void> => scrollDownAndUp(page, catalogScroll);
    await once();
    const result = await run({ interaction, cpu, session, page, once });
    await keepFrameResult(result, 'agents');
    expect(result.median.fps).toBeGreaterThan(0);
  });
