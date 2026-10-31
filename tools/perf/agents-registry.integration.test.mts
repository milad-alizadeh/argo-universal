import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { publishedRegistry } from '../../mocks/registry/catalog.ts';
import {
  agentCount,
  longRegistry,
  type Registry,
  requireCatalog,
} from './agents-registry.mts';

const registryFile = async (registry: Registry): Promise<string> => {
  const file = path.join(
    await mkdtemp(path.join(os.tmpdir(), 'argo-agents-registry-')),
    'registry.json',
  );

  await writeFile(file, JSON.stringify(registry));

  return file;
};

it('reads the catalog size back from the file the Server starts from', async () => {
  expect(await requireCatalog(await registryFile(longRegistry()))).toBe(
    agentCount,
  );
});

it('refuses a Server still holding the scripted registry', async () => {
  await expect(
    requireCatalog(await registryFile(publishedRegistry)),
  ).rejects.toThrow(
    new RegExp(
      `claims ${agentCount} Agents.*lists ${publishedRegistry.agents.length}`,
      'u',
    ),
  );
});
