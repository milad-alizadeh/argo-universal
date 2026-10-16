import { z } from 'zod';
import identities from './identities.json' with { type: 'json' };
import registryIds from './registry-identities.json' with { type: 'json' };

export const fixtureRegistryIds = registryIds;

import { type AgentIdentity } from './metadata';
import { isScenarioName, type ScenarioName } from './scenarios';

export const AppFixtureOptions = z.object({
  availability: z
    .enum(['available', 'not_installed', 'not_signed_in'])
    .default('available'),
  scenario: z.custom<ScenarioName>(isScenarioName).default('reply'),
});

export type AppFixtureOptions = z.input<typeof AppFixtureOptions>;

export const AppFixtureAgents = z.record(z.string(), AppFixtureOptions);

export type AppFixtureAgents = z.input<typeof AppFixtureAgents>;

export const fixtureAgents: AgentIdentity[] = identities;

export const appFixtureAgentIds = fixtureAgents.map(({ agent }) => agent);
