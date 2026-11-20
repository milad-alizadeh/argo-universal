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

type LocateDeps = Parameters<typeof pluginInstructions>[0];

const locateIn = (home: string, disabled: string[] = []): LocateDeps => ({
  home,
  version: '1.2.3',
  firstPartyPluginsDirectory: join(home, shippedFolder),
  pluginSettings: {
    enabled: (pluginId) => !disabled.includes(pluginId),
    setEnabled: () => Promise.resolve(),
    values: () => Promise.resolve({ values: {}, secretsSet: [] }),
    change: () => Promise.resolve(),
  },
});

it('drops only the Plugin whose instructions cannot be read', async () => {
  const home = await createRuntimePlugins(plugins);
  const reported: string[] = [];

  const found = await pluginInstructions(locateIn(home), {
    readText,
    report: (line) => reported.push(line),
  });

  expect(found.map(({ pluginId }) => pluginId)).toEqual(['fine']);
  expect(reported).toEqual(['Plugin broken: instructions unreadable: EIO']);
});

it('gives each enabled Plugin prose under its name in Plugin id order, leaving out disabled and blank ones', async () => {
  const home = await createRuntimePlugins([
    { id: 'zeta', name: 'Alpha', fixture: 'healthy', instructions: 'Last.' },
    { id: 'alpha', name: 'Zulu', fixture: 'healthy', instructions: 'First.' },
    { id: 'off', name: 'Off', fixture: 'healthy', instructions: 'Hidden.' },
    { id: 'blank', name: 'Blank', fixture: 'healthy', instructions: '  \n\n' },
  ]);

  expect(await pluginInstructions(locateIn(home, ['off']))).toEqual([
    { pluginId: 'alpha', name: 'Zulu', text: 'First.' },
    { pluginId: 'zeta', name: 'Alpha', text: 'Last.' },
  ]);
});
