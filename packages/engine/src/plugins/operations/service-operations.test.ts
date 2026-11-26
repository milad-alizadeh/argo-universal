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

const asking = PluginOperationContribution.parse({
  name: 'set',
  label: 'Set',
  description: 'Turn one on.',
  tier: 'act',
  policy: 'ask',
  askWhen: { param: 'kind', is: ['merge'] },
  params: {
    kind: {
      type: 'string',
      description: 'Which.',
      required: true,
      choices: ['fix', 'merge'],
    },
  },
});

// Whether an Agent's run of `set` raised a Permission request.
async function asked(kind: string): Promise<boolean> {
  const cards: unknown[] = [];

  const port: OperationsPort = {
    list: async () =>
      PluginList.parse({
        plugins: [
          {
            ...list.plugins[0],
            manifest: {
              ...list.plugins[0]?.manifest,
              contributes: { nav: [], operations: [asking] },
            },
          },
        ],
        errors: [],
      }),
    requireRunning: async () => {},
    call: async () => ({ ok: true, result: null }),
  };

  await runDeclaredOperation(port, {
    pluginId: 'github',
    name: 'set',
    params: { kind },
    caller: { sessionId: 's', projectId: 'p' },
    confirm: (card) => {
      cards.push(card);

      return Promise.resolve('once');
    },
  });

  return cards.length > 0;
}

it('asks for a value askWhen names', async () => {
  expect(await asked('merge')).toBe(true);
});

it('runs without a Permission request for a value askWhen does not name', async () => {
  expect(await asked('fix')).toBe(false);
});

it('refuses askWhen on a policy that does not ask', () => {
  expect(() =>
    PluginOperationContribution.parse({ ...asking, policy: 'allow' }),
  ).toThrow('Only an ask policy');
});

it('refuses askWhen for a value the param does not offer', () => {
  expect(() =>
    PluginOperationContribution.parse({
      ...asking,
      askWhen: { param: 'kind', is: ['other'] },
    }),
  ).toThrow('askWhen names a choice param');
});
