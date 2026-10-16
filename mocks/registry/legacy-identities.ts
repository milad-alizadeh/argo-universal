import type { ACPAgentRegistry } from '@repo/contracts';
import { publishedRegistry } from './catalog';
import identities from './legacy-identities.json';

export const legacyRegistryIdentities = identities;

const template = publishedRegistry.agents[0];

if (!template) throw new Error('Registry identity fixture needs an Agent');

export const identityRegistry: ACPAgentRegistry = {
  ...publishedRegistry,
  agents: legacyRegistryIdentities.map(({ id, name }) => ({
    ...template,
    id,
    name,
  })),
};
