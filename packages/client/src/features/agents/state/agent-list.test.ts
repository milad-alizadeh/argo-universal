import {
  identityRegistry,
  registryIdentities,
} from '@repo/mocks/registry/identities';
import { expect, it } from 'vitest';
import { agentList } from './agent-list';

it.each(registryIdentities)(
  'uses Registry id and name for $name even when the saved name differs',
  ({ id, name }) => {
    const entry = identityRegistry.agents.find((agent) => agent.id === id);

    if (!entry) throw new Error('Registry identity fixture is missing');

    expect(
      agentList(
        [{ id, name: 'Outdated saved name', version: 'older', env: {} }],
        {
          agents: [{ entry, support: 'npx' }],
          error: null,
        },
      ),
    ).toEqual([
      expect.objectContaining({
        id,
        name,
        installed: true,
        unavailable: false,
      }),
    ]);
  },
);
