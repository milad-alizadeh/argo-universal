import { z } from 'zod';
import identities from './identities.json' with { type: 'json' };
import { type AgentIdentity } from './metadata';
import { isScenarioName, type ScenarioName } from './scenarios';

// An installed fixture Agent runs its scenario; its Readiness comes from the Server's own check of it.
export const AppFixtureOptions = z.object({
  installed: z.boolean().default(true),
  scenario: z.custom<ScenarioName>(isScenarioName).default('reply'),
});

export type AppFixtureOptions = z.input<typeof AppFixtureOptions>;

export const AppFixtureAgents = z.record(z.string(), AppFixtureOptions);

export type AppFixtureAgents = z.input<typeof AppFixtureAgents>;

export const fixtureAgents: AgentIdentity[] = identities;

export const appFixtureAgentIds = fixtureAgents.map(({ agent }) => agent);
