import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import bundleEngine from '../../e2e/engine-bundle.ts';
import { startOwnServer } from '../../e2e/own-server.ts';
import { publishedRegistry } from '../../mocks/registry/catalog.ts';
import {
  agentCount,
  longRegistry,
  type Registry,
  requireServedCatalog,
} from './agents-registry.mts';

const directories: string[] = [];

beforeAll(bundleEngine);

afterAll(async () => {
  await Promise.all(
    directories.map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

// Starts a real Server from `registry`, asks it what it serves, and stops it.
async function servedCatalog(registry: Registry): Promise<number> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'argo-agents-registry-'),
  );

  directories.push(directory);

  const server = await startOwnServer(directory, {}, { registry });

  try {
    return await requireServedCatalog(server.httpUrl);
  } finally {
    await server.stop();
  }
}

it('counts the Agents a Server started from the long registry serves', async () => {
  expect(await servedCatalog(longRegistry())).toBe(agentCount);
});

it('refuses a Server that serves fewer Agents than the scenario claims', async () => {
  await expect(servedCatalog(publishedRegistry)).rejects.toThrow(
    new RegExp(
      `claims ${agentCount} Agents but the Server serves ${publishedRegistry.agents.length}`,
      'u',
    ),
  );
});
