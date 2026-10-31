import { operations } from '@repo/contracts/operations';
import { publishedRegistry } from '../../mocks/registry/catalog.ts';
import { query } from './trpc-http.mts';

// The Agents page against a registry long enough that its list must virtualise.
export const agentCount = 200;

export type Registry = typeof publishedRegistry;

type RegistryAgent = Registry['agents'][number];

const numbered = (agent: RegistryAgent, number: number): RegistryAgent => ({
  ...agent,
  id: `${agent.id}-${number}`,
  name: `${agent.name} ${number}`,
});

// The published registry's Agents copied and numbered until it lists exactly `count` Agents.
export const longRegistry = (count: number = agentCount): Registry => {
  const { agents } = publishedRegistry;
  const rounds = Math.ceil(count / agents.length);

  return {
    ...publishedRegistry,
    agents: Array.from({ length: rounds }, (_, round) =>
      agents.map((agent, index) =>
        numbered(agent, round * agents.length + index + 1),
      ),
    )
      .flat()
      .slice(0, count),
  };
};

type Listing = { agents: readonly { id: string }[] };

// How many distinct Agents a listing holds; a repeated id would collapse in the Server's catalog.
export function distinctAgents({ agents }: Listing): number {
  const ids = new Set(agents.map(({ id }) => id));

  if (ids.size !== agents.length)
    throw new Error(
      `The listing holds ${agents.length} Agents but ${ids.size} ids`,
    );

  return agents.length;
}

const registryGet = {
  path: 'registry.get',
  input: operations['registry.get'].params,
  output: operations['registry.get'].result,
} as const;

/*
 * The scenario reports the count the running Server serves, asked over the wire as the App asks
 * (`registry.get`), not the registry file this run wrote and not `agentCount`. A Server that ignored,
 * cached or failed to reload that file serves a different catalog, and that fails the run here
 * instead of being measured.
 */
export async function requireServedCatalog(httpUrl: string): Promise<number> {
  const count = distinctAgents(await readServedCatalog(httpUrl));

  if (count !== agentCount)
    throw new Error(
      `The agents scenario claims ${agentCount} Agents but the Server serves ${count}`,
    );

  return count;
}

async function readServedCatalog(httpUrl: string): Promise<Listing> {
  const { agents } = await query(httpUrl, registryGet);

  return { agents: agents.map(({ entry }) => ({ id: entry.id })) };
}
