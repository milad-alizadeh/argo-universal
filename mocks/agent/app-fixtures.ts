import { agentAdapters } from '@repo/agents';
import type { AgentAdapter, AgentProbe } from '@repo/agents';
import { z } from 'zod';
import { createMockAdapter, type MockAgentScript } from './adapter';

export const AppFixtureOptions = z.object({
  availability: z
    .enum(['available', 'not_installed', 'not_signed_in'])
    .default('available'),
  scenario: z.enum(['reply', 'image']).default('reply'),
});
export type AppFixtureOptions = z.input<typeof AppFixtureOptions>;
export const AppFixtureAgents = z.record(z.string(), AppFixtureOptions);
export type AppFixtureAgents = z.input<typeof AppFixtureAgents>;

type AgentIdentity = Pick<AgentAdapter, 'agent' | 'label' | 'logo'>;

function fixtureProbe(options: z.output<typeof AppFixtureOptions>): AgentProbe {
  return {
    availability: options.availability,
    installStep:
      options.availability === 'available'
        ? undefined
        : 'Set up this Agent to start a Session.',
    configOptions: [],
  };
}

function createAppFixtureScript(
  options: z.output<typeof AppFixtureOptions>,
): MockAgentScript {
  return {
    probe: async (): Promise<AgentProbe> => fixtureProbe(options),
    connect: (): never => {
      throw new Error('App fixtures require the ACP process port');
    },
  };
}

export function createAppFixtureAdapter(
  identity: AgentIdentity,
  options: AppFixtureOptions = {},
): ReturnType<typeof createMockAdapter> {
  return {
    ...createMockAdapter(
      createAppFixtureScript(AppFixtureOptions.parse(options)),
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
): ReturnType<typeof createMockAdapter>[] {
  return identities.map((identity): ReturnType<typeof createMockAdapter> =>
    createAppFixtureAdapter(identity, options[identity.agent]),
  );
}

export const appFixtureAgentIds = agentAdapters.map(
  (adapter): string => adapter.agent,
);
