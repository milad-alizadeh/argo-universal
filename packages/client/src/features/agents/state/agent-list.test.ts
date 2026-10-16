import {
  identityRegistry,
  legacyRegistryIdentities,
} from '@repo/mocks/registry/legacy-identities';
import { expect, it } from 'vitest';
import { agentList } from './agent-list';

it.each(legacyRegistryIdentities)(
  'uses Registry id and name for $name even when the saved name differs',
  ({ id, name, local }) => {
    const entry = identityRegistry.agents.find((agent) => agent.id === id);

    if (!entry) throw new Error('Registry identity fixture is missing');

    expect(
      agentList([{ id, name: local, version: 'older', env: {} }], {
        agents: [{ entry, support: 'npx' }],
        error: null,
      }),
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
