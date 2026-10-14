import type { Page } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { agentId } from './scenario-agents';
import { query } from './server-query';

const AgentsList = z.array(
  z.object({
    status: z.string(),
    enabled: z.boolean(),
    agent: z.string(),
    label: z.string(),
    reason: z.string().optional(),
  }),
);
export type ListedAgent = z.infer<typeof AgentsList>[number];

// The Agents as saved now, without waiting for Readiness checks.
export const listAgents = (
  page: Page,
  httpUrl: string,
): Promise<ListedAgent[]> =>
  query({
    page,
    httpUrl,
    procedure: 'agents.list',
    input: {},
    output: AgentsList,
  });

// The Agents once the Server's Readiness checks at start have settled; a disabled Agent is never checked.
export async function readAgents(
  page: Page,
  httpUrl: string,
): Promise<ListedAgent[]> {
  await expect
    .poll(
      async () =>
        (await listAgents(page, httpUrl)).some(
          ({ enabled, status }) => enabled && status === 'checking',
        ),
      { timeout: 20_000 },
    )
    .toBe(false);
  return listAgents(page, httpUrl);
}

export async function readAgent(
  page: Page,
  httpUrl: string,
  ordinal: number,
): Promise<ListedAgent> {
  const id = agentId(ordinal);
  const found = (await readAgents(page, httpUrl)).find(
    (entry): boolean => entry.agent === id,
  );
  if (!found) throw new Error(`The Server has no Agent ${id}`);
  return found;
}
