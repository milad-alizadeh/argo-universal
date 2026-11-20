import { PluginList } from '@repo/contracts/plugins';
import {
  PluginOperationContribution,
  type PluginOperationTier,
} from '@repo/contracts/plugins/plugin-operations';
import { expect, it } from 'vitest';
import {
  runDeclaredOperation,
  type OperationsPort,
} from './service-operations';

const operation = (
  name: string,
  tier: PluginOperationTier,
): PluginOperationContribution =>
  PluginOperationContribution.parse({
    name,
    label: name,
    description: `The ${name} Operation.`,
    tier,
    policy: 'allow',
  });

const list = PluginList.parse({
  plugins: [
    {
      manifest: {
        id: 'github',
        name: 'GitHub',
        version: '1.0.0',
        engines: { argo: '>=0.0.0 <2' },
        main: 'index.tsx',
        icon: { material: 'extension' },
        contributes: {
          nav: [],
          operations: [operation('list', 'read'), operation('attach', 'act')],
        },
      },
      firstParty: true,
      enabled: true,
      state: 'not-started',
      hanging: false,
      error: null,
    },
  ],
  errors: [],
});

// The tier the run was handed to the Plugin runtime with.
async function tierOf(name: string): Promise<PluginOperationTier | undefined> {
  const tiers: Array<PluginOperationTier | undefined> = [];

  const port: OperationsPort = {
    list: async () => list,
    requireRunning: async () => {},
    call: async (_pluginId, request) => {
      tiers.push(request.tier);

      return { ok: true, result: null };
    },
  };

  await runDeclaredOperation(port, {
    pluginId: 'github',
    name,
    params: {},
    caller: { person: true },
  });

  return tiers[0];
}

it('hands the tier its manifest declares to the runtime with the run, so a read-tier run is not a write', async () => {
  expect(await tierOf('list')).toBe('read');
  expect(await tierOf('attach')).toBe('act');
});
