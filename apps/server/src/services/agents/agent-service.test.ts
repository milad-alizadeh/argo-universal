import type { AgentProbe } from '@repo/agents';
import { createMockAdapter } from '@repo/mocks/agent';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import { openTestDatabase } from '#mocks/database';
import { registryMachine } from '../sessions/registry-machine';
import { createAgentService } from './agent-service';

const { database, remove } = openTestDatabase();
afterAll(remove);
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function startAgents(...probes: (() => Promise<AgentProbe>)[]) {
  const adapters = probes.map((probe, index) =>
    createMockAdapter({ probe }, `agent-${index + 1}`),
  );
  const sessions = createActor(registryMachine, {
    input: { database, adapters },
  }).start();
  cleanups.push(() => sessions.stop());
  return createAgentService(sessions);
}

const available: AgentProbe = { availability: 'available', configOptions: [] };

it('probes each Agent once at start and answers later lists from that probe', async () => {
  const probe = vi.fn(async () => available);
  const agents = startAgents(probe);
  const [first, second] = await Promise.all([agents.list(), agents.list()]);
  expect(await agents.list()).toEqual(first);
  expect(second).toEqual([
    {
      agent: 'agent-1',
      label: 'agent-1',
      logo: expect.stringContaining('<svg'),
      ...available,
    },
  ]);
  expect(probe).toHaveBeenCalledTimes(1);
});

it('probes every Agent again on refresh', async () => {
  const probe = vi
    .fn<() => Promise<AgentProbe>>()
    .mockResolvedValueOnce({
      availability: 'not_signed_in',
      installStep: 'Sign in',
      configOptions: [],
    })
    .mockResolvedValue(available);
  const other = vi.fn(async () => available);
  const agents = startAgents(probe, other);
  expect((await agents.list())[0]?.availability).toBe('not_signed_in');
  expect((await agents.list({ refresh: true }))[0]?.availability).toBe(
    'available',
  );
  expect(probe).toHaveBeenCalledTimes(2);
  expect(other).toHaveBeenCalledTimes(2);
});
