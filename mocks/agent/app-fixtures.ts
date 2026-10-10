import { agentAdapters } from '@repo/agents';
import type { AgentAdapter, AgentProbe } from '@repo/agents';
import { SessionConfigOption as ArgoConfigOption } from '@repo/contracts';
import { z } from 'zod';
import { acpConfiguration } from './acp-configuration';
import { createAgentMetadata } from './metadata';
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

const appConfiguration = acpConfiguration.map(({ id, ...option }) =>
  ArgoConfigOption.parse({ ...option, configId: id }),
);

type AgentIdentity = Pick<AgentAdapter, 'agent' | 'label' | 'logo'>;

function fixtureProbe(options: z.output<typeof AppFixtureOptions>): AgentProbe {
  return {
    availability: options.availability,
    installStep:
      options.availability === 'available'
        ? undefined
        : 'Set up this Agent to start a Session.',
    configOptions: options.availability === 'available' ? appConfiguration : [],
  };
}

export function createAppFixtureAdapter(
  identity: AgentIdentity,
  options: AppFixtureOptions = {},
): ReturnType<typeof createAgentMetadata> {
  return {
    ...createAgentMetadata(
      {
        discovery: [{ result: fixtureProbe(AppFixtureOptions.parse(options)) }],
      },
      identity.agent,
    ),
    agent: identity.agent,
    label: identity.label,
    logo: identity.logo,
  };
}

export function createAppFixtureAdapters(
  identities: readonly AgentIdentity[],
  options: AppFixtureAgents = {},
): ReturnType<typeof createAgentMetadata>[] {
  return identities.map((identity): ReturnType<typeof createAgentMetadata> =>
    createAppFixtureAdapter(identity, options[identity.agent]),
  );
}

export const appFixtureAgentIds = agentAdapters.map(
  (adapter): string => adapter.agent,
);
