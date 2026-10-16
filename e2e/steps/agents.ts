import type { Page } from '@playwright/test';
import { z } from 'zod';
import { agentId } from './scenario-agents';
import { query } from './server-query';

const AgentsList = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  }),
);

export type ListedAgent = z.infer<typeof AgentsList>[number];

export function readAgents(
  page: Page,
  httpUrl: string,
): Promise<ListedAgent[]> {
  return query({
    page,
    httpUrl,
    procedure: 'agents.servers',
    input: {},
    output: AgentsList,
  });
}

export async function readAgent(
  page: Page,
  httpUrl: string,
  ordinal: number,
): Promise<ListedAgent> {
  const id = agentId(ordinal);

  const found = (await readAgents(page, httpUrl)).find(
    (entry): boolean => entry.id === id,
  );

  if (!found) throw new Error(`The Server has no Agent ${id}`);

  return found;
}
