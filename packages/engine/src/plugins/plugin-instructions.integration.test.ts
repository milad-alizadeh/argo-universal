import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { createRuntimePlugins, shippedFolder } from '#mocks/runtime-plugins';
import { pluginInstructions } from './plugin-instructions';

const reads = new Map<string, number>();

// A file read once for the manifest's check then fails, as one deleted between discovery and the read does.
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...original,
    readFile: async (...args: Parameters<typeof original.readFile>) => {
      const path = String(args[0]);
      const count = (reads.get(path) ?? 0) + 1;
      reads.set(path, count);

      if (path.includes('/broken/instructions.md') && count > 1)
        throw new Error('EIO');

      return original.readFile(...args);
    },
  };
});

it('drops only the Plugin whose instructions cannot be read', async () => {
  const home = await createRuntimePlugins(
    ['broken', 'fine'].map((id) => ({
      id,
      fixture: 'healthy',
      instructions: `${id} prose`,
    })),
  );

  const found = await pluginInstructions({
    home,
    version: '1.2.3',
    firstPartyPluginsDirectory: join(home, shippedFolder),
    pluginSettings: {
      enabled: () => true,
      setEnabled: async () => undefined,
      values: async () => ({ values: {} }) as never,
      change: async () => undefined,
    },
  });

  expect(found.map(({ pluginId }) => pluginId)).toEqual(['fine']);
});
