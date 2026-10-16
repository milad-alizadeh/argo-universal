import {
  identityRegistry,
  registryIdentities,
} from '@repo/mocks/registry/identities';
import { expect, it } from 'vitest';
import { agentsPage } from './agent-rows';
import { loaded, registryOf, server } from './installed-agents.mocks';

it.each(registryIdentities)(
  'uses Registry id and name for $name even when the saved name differs',
  ({ id, name }) => {
    const entry = identityRegistry.agents.find((agent) => agent.id === id);

    if (!entry) throw new Error('Registry identity fixture is missing');

    const page = agentsPage(loaded(server(id, 'Outdated saved name')), {
      status: 'loaded',
      registry: registryOf({ entry, support: 'npx' }),
    });

    expect(page.rows).toEqual([
      expect.objectContaining({
        id,
        name,
        installed: true,
        unavailable: false,
      }),
    ]);
  },
);
