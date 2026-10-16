import {
  identityRegistry as registry,
  legacyRegistryIdentities as identities,
} from '@repo/mocks/registry/legacy-identities';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { seedLegacyAgents } from '#mocks/registry-identity';

it.each([
  { state: 'an installed release', installed: true },
  { state: 'no installed release', installed: false },
])(
  'upgrades $state with Registry identities and names while preserving local installations',
  async ({ installed }) => {
    const home = await seedLegacyAgents(installed);

    const host = await startEngineTestHost({
      home,
      fixtureAgents: [],
      fetchAgents: async () => JSON.stringify(registry),
    });

    expect(await host.caller.agents.servers()).toEqual(
      identities.map(({ local, id, name }) => ({
        id,
        name,
        version: '1.2.3',
        icon: registry.agents[0]?.icon,
        env: { SAVED_ENV: local },
      })),
    );
    expect(
      (await host.caller.agents.registry()).agents.map(({ entry }) => ({
        id: entry.id,
        name: entry.name,
      })),
    ).toEqual(identities.map(({ id, name }) => ({ id, name })));

    for (const { local, id, name } of identities) {
      expect(
        host.database.$client
          .prepare('SELECT id FROM agents WHERE registry_id = ?')
          .get(id),
      ).toEqual({ id: local });
      expect(
        host.database.$client
          .prepare('SELECT agent FROM session WHERE id = ?')
          .get(local),
      ).toEqual({ agent: id });
      expect(
        (await host.caller.agents.installStatus({ agentId: local }))
          .installation.status,
      ).toBe(installed ? 'installed' : 'not-installed');
      expect(await host.caller.agents.list()).toContainEqual(
        expect.objectContaining({ agent: local, label: name }),
      );
    }
  },
);
