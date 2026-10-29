import type { Page } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
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
    procedure: 'agent.list',
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

// A scripted Agent's fixture comes from scenario-agents.ts; its step checks only that the Server lists that Agent.
export async function expectListedAgent(
  { page, server }: { page: Page; server: { httpUrl: string } },
  ordinal: number,
): Promise<void> {
  expect(await readAgent(page, server.httpUrl, ordinal)).toMatchObject({
    id: agentId(ordinal),
  });
}
