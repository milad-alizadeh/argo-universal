import type { ACPAgentRegistry } from '@repo/contracts';
import { publishedRegistry } from './catalog';

import identities from './identities.json';

export const registryIdentities = identities;

const template = publishedRegistry.agents[0];

if (!template) throw new Error('Registry identity fixture needs an Agent');

export const identityRegistry: ACPAgentRegistry = {
  ...publishedRegistry,
  agents: registryIdentities.map((identity) => ({ ...template, ...identity })),
};
