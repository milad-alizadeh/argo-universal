import { expect, it } from 'vitest';
import { MemoryKeychain } from '#mocks/memory-keychain';
import { scratch } from '#mocks/probe-plugin';
import { PluginAssets } from './assets';
import type { StateRequest } from './plugin-calls';
import { PluginServices } from './plugin-services';
import { PluginStorage } from './storage';

const echo: StateRequest = {
  api: 'process',
  call: { action: 'run', argv: ['echo', 'hi'] },
};

it('keeps no Grants for a Plugin once it is released', async () => {
  const home = await scratch();

  const services = new PluginServices(
    new PluginStorage(home),
    new MemoryKeychain(),
    {
      assets: new PluginAssets(home),
      log: (): void => {},
      projects: async (): Promise<string[]> => [],
      trackerProjects: async (): Promise<
        { id: string; name: string; repository: string | null }[]
      > => [],
    },
  );

  services.activate('probe', {
    grants: [{ kind: 'process:exec', command: 'echo', args: ['*'] }],
    codeFolder: home,
  });

  expect(await services.handle('probe', 1, echo)).toMatchObject({
    ok: true,
    value: { stdout: 'hi\n' },
  });

  services.release('probe');

  expect(await services.handle('probe', 1, echo)).toEqual({
    ok: false,
    error: 'Refused: echo hi is not a declared command',
  });
  services.close();
});
