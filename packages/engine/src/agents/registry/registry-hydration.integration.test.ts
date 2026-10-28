import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('rejects malformed saved Agent row columns rather than silently hiding the Agent', async () => {
  const host = await startEngineTestHost({
    fetchAgents: async () => JSON.stringify(publishedRegistry),
  });

  await host.caller.registry.refresh();
  await host.caller.agent.install({ id: 'example-agent' });
  host.database.$client.exec('UPDATE agent_servers SET id = NULL');
  await expect(host.caller.agent.list()).rejects.toThrow(
    'Stored saved Agent row is malformed',
  );
});

it('rejects a second Registry cache row at the storage boundary', async () => {
  const host = await startEngineTestHost();
  expect(() =>
    host.database.$client.exec('INSERT INTO registry_cache (id) VALUES (2)'),
  ).toThrow('CHECK constraint failed');
});
