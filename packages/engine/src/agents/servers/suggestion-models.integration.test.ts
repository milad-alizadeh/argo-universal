import {
  identityRegistry,
  registryIdentities,
} from '@repo/mocks/registry/identities';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { defaultSuggestionModel, vendorRegistryIds } from '../vendor';

const claude = vendorRegistryIds.claude;

const startIdentityHost = async (): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>>
> => {
  const host = await startEngineTestHost({
    fixtureAgents: [],
    fetchAgents: async () => JSON.stringify(identityRegistry),
  });

  await host.caller.registry.refresh();

  return host;
};

it('starts every Installed Agent on its vendor default, with no models before a Session', async () => {
  const host = await startIdentityHost();

  for (const { id } of registryIdentities)
    await host.caller.agent.install({ id });

  expect(await host.caller.agent.getSuggestionModels()).toEqual(
    registryIdentities.map(({ id, name }) => ({
      id,
      name,
      choice: defaultSuggestionModel(id),
      models: [],
    })),
  );
  expect(defaultSuggestionModel(claude)).toEqual({
    type: 'model',
    value: 'haiku',
  });
  expect(defaultSuggestionModel('example-agent')).toEqual({ type: 'session' });
});

it.each([
  { type: 'session' as const },
  { type: 'model' as const, value: 'sonnet' },
])('keeps a chosen suggestion model: %o', async (choice) => {
  const host = await startIdentityHost();

  await host.caller.agent.install({ id: claude });
  await host.caller.agent.setSuggestionModel({ id: claude, choice });

  expect(await host.caller.agent.getSuggestionModels()).toEqual([
    expect.objectContaining({ id: claude, choice }),
  ]);
});
