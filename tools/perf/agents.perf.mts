import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type CDPSession, expect, type Page, test } from '@playwright/test';
import { startOwnServer } from '@repo/e2e/own-server';
import { publishedRegistry } from '../../mocks/registry/catalog.ts';
import {
  desktop,
  jump,
  openApp,
  phone,
  scrollDownAndUp,
  type Viewport,
} from './page.mts';
import { cpuRates, report, type Result, run, wanted } from './results.mts';

// The Agents page against a registry long enough that its list must virtualise.
const agentCount = 200;

const catalogScroll = 'agents-catalog';

const settleMilliseconds = 1000;

type Server = Awaited<ReturnType<typeof startOwnServer>>;

type Registry = typeof publishedRegistry;

type RegistryAgent = Registry['agents'][number];

const results: Result[] = [];

let server: Server;

const numbered = (agent: RegistryAgent, number: number): RegistryAgent => ({
  ...agent,
  id: `${agent.id}-${number}`,
  name: `${agent.name} ${number}`,
});

// The published registry's Agents copied and numbered until it lists `agentCount`.
const longRegistry = (): Registry => {
  const { agents } = publishedRegistry;

  return {
    ...publishedRegistry,
    agents: Array.from({ length: agentCount / agents.length }, (_, round) =>
      agents.map((agent, index) =>
        numbered(agent, round * agents.length + index + 1),
      ),
    ).flat(),
  };
};

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  server = await startOwnServer(
    await mkdtemp(path.join(os.tmpdir(), 'argo-perf-agents-')),
    {},
  );
  await writeFile(server.registryPath, JSON.stringify(longRegistry()));
});

test.afterAll(async () => {
  await server.stop();
  await report(results, { agents: agentCount }, 'agents');
});

const agentLink = (page: Page, name: string): ReturnType<Page['getByRole']> =>
  page.getByRole('link', { name: new RegExp(`^${name},`, 'u') });

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
  await agentLink(page, 'Example Agent 1').waitFor();

  return session;
}

// Reaches the last Agent once, so the list has measured every row before the flicks.
async function warmList(page: Page): Promise<void> {
  await jump(page, catalogScroll, false);
  await agentLink(page, `Windows Agent ${agentCount}`).waitFor();
  await jump(page, catalogScroll, true);
  await page.waitForTimeout(settleMilliseconds);
}

const viewports = {
  agents: desktop,
  'agents-phone': phone,
} satisfies Record<string, Viewport>;

for (const cpu of cpuRates)
  for (const [interaction, viewport] of Object.entries(viewports).filter(
    ([name]) => wanted(name),
  ))
    test(`${interaction} at ${cpu}x CPU`, async ({ page }) => {
      const session = await openAgents(page, viewport);
      await warmList(page);
      const once = (): Promise<void> => scrollDownAndUp(page, catalogScroll);
      await once();
      const result = await run({ interaction, cpu, session, page, once });
      results.push(result);
      expect(result.median.fps).toBeGreaterThan(0);
    });
