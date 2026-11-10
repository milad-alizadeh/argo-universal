import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import { createRuntimePlugins, shippedFolder } from '#mocks/runtime-plugins';
import { pluginInstructions } from './plugin-instructions';

const plugins = ['broken', 'fine'].map((id) => ({
  id,
  fixture: 'healthy',
  instructions: `${id} prose`,
}));

// A read that fails for the broken Plugin's file, as one that goes missing after discovery does.
const readText = async (path: string): Promise<string> => {
  if (basename(dirname(path)) === 'broken') throw new Error('EIO');

  return readFile(path, 'utf8');
};

it('drops only the Plugin whose instructions cannot be read', async () => {
  const home = await createRuntimePlugins(plugins);
  const reported: string[] = [];

  const found = await pluginInstructions(
    {
      home,
      version: '1.2.3',
      firstPartyPluginsDirectory: join(home, shippedFolder),
      pluginSettings: {
        enabled: () => true,
        setEnabled: () => Promise.resolve(),
        values: () => Promise.resolve({ values: {}, secretsSet: [] }),
        change: () => Promise.resolve(),
      },
    },
    { readText, report: (line) => reported.push(line) },
  );

  expect(found.map(({ pluginId }) => pluginId)).toEqual(['fine']);
  expect(reported).toEqual(['Plugin broken: instructions unreadable: EIO']);
});
