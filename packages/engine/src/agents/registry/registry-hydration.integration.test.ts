import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

it('rejects malformed saved Agent row columns rather than silently hiding the Agent', async () => {
  const host = await startEngineTestHost({
    fetchAgents: async () => JSON.stringify(publishedRegistry),
  });

  await host.caller.agents.refreshRegistry();
  await host.caller.agents.addRegistry({ id: 'example-agent' });
  host.database.$client.exec('UPDATE agent_servers SET id = NULL');
  await expect(host.caller.agents.servers()).rejects.toThrow(
    'Stored saved Agent row is malformed',
  );
});
