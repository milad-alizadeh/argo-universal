import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { publishedRegistry } from '../../mocks/registry/catalog.ts';

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

const listing = z.object({ agents: z.array(z.object({ id: z.string() })) });

type Listing = z.infer<typeof listing>;

// How many distinct Agents a registry lists; a repeated id would collapse in the Server's catalog.
export function distinctAgents({ agents }: Listing): number {
  const ids = new Set(agents.map(({ id }) => id));

  if (ids.size !== agents.length)
    throw new Error(
      `The registry lists ${agents.length} Agents but ${ids.size} ids`,
    );

  return agents.length;
}

/*
 * The scenario reports the count read back from the registry file the Server starts from, not
 * `agentCount`, so a catalog that is not the size it claims fails the run instead of being measured.
 */
export async function requireCatalog(registryPath: string): Promise<number> {
  const seeded = distinctAgents(
    listing.parse(JSON.parse(await readFile(registryPath, 'utf8'))),
  );

  if (seeded !== agentCount)
    throw new Error(
      `The agents scenario claims ${agentCount} Agents but the Server's registry lists ${seeded}`,
    );

  return seeded;
}
