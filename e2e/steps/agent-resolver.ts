import { chmod, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect } from '../fixtures';
import { Given, Then, test } from './fixtures';
import { agentWork } from './timeouts';

const pathAgentName = 'Path Agent';

const entrypoint = 'path-agent';

const [template] = publishedRegistry.agents;

// A binary Agent with one entrypoint name on every platform, so the Resolver can look for it on PATH.
const target = {
  archive: 'https://example.org/path-agent.tar.gz',
  cmd: `./${entrypoint}`,
};

const pathAgent = {
  ...template,
  id: entrypoint,
  name: pathAgentName,
  distribution: {
    binary: Object.fromEntries(
      ['darwin-aarch64', 'darwin-x86_64', 'linux-aarch64', 'linux-x86_64'].map(
        (platform) => [platform, target],
      ),
    ),
  },
};

// The scripted Agent behind a launcher on PATH, as a package manager would leave it.
const launcher = (): string => {
  const { executable, args } = scriptedAgentCommand('reply');
  const quoted = [executable, ...args].map((part) => `"${part}"`).join(' ');

  return `#!/bin/sh\nexec ${quoted} "$@"\n`;
};

// Replaced in one rename, so a sync running now never reads half a file.
const publishPathAgent = async (registryPath: string): Promise<void> => {
  const next = `${registryPath}.next`;
  await writeFile(
    next,
    JSON.stringify({
      ...publishedRegistry,
      agents: [...publishedRegistry.agents, pathAgent],
    }),
  );
  await rename(next, registryPath);
};

Given(
  'Path Agent is installed on this Mac outside Argo',
  async ({ app }): Promise<void> => {
    const file = path.join(app.machinePath, entrypoint);
    await writeFile(file, launcher());
    await chmod(file, 0o755);
    await publishPathAgent(app.registryPath);
  },
);

Then(
  'Path Agent is Ready and Found on this Mac without an install',
  async ({ page }): Promise<void> => {
    const row = page.getByRole('link', {
      name: new RegExp(`^${pathAgentName},.*Ready$`),
    });

    await expect(row).toBeVisible(agentWork);
    await row.click();
    await expectFoundOnThisMac(page);
  },
);

async function expectFoundOnThisMac(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: pathAgentName, level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByText('Found on this Mac', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Install', exact: true }),
  ).toHaveCount(0);
  await capture(page);
}

// Evidence for the PR: the Agent page of an Agent found outside Argo.
const capture = (page: Page): Promise<Buffer> =>
  page.screenshot({
    path: test.info().outputPath('agent-found-on-this-mac.png'),
    animations: 'disabled',
  });
