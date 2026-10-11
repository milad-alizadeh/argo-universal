import type { AgentProbe } from '@repo/agents';
import { createAgentMetadata } from '@repo/mocks/agent';
import { expect, it, vi } from 'vitest';
import { agentCatalog, availableAgentProbe } from '#mocks/agent-catalog';
import { startEngineTestHost } from '#mocks/engine';

it('answers concurrent availability queries from one discovery result', async (): Promise<void> => {
  const adapter = createAgentMetadata(
    { discovery: [{ result: availableAgentProbe }] },
    'agent-one',
  );
  const discoverAgent = vi.spyOn(adapter, 'probe');
  const { caller } = await startEngineTestHost({
    adapters: [adapter],
  });
  const results = await Promise.all([
    caller.agents.list(),
    caller.agents.list(),
  ]);
  const expectedCatalog = [
    {
      agent: 'agent-one',
      label: 'agent-one',
      logo: expect.stringContaining('<svg'),
      ...availableAgentProbe,
    },
  ];
  expect(results).toEqual([expectedCatalog, expectedCatalog]);
  expect(discoverAgent).toHaveBeenCalledTimes(1);
});

it('answers a later availability query without another discovery handshake', async (): Promise<void> => {
  const adapter = createAgentMetadata({
    discovery: [{ result: availableAgentProbe }],
  });
  const discoverAgent = vi.spyOn(adapter, 'probe');
  const { caller } = await startEngineTestHost({
    adapters: [adapter],
  });
  await caller.agents.list();
  const catalog = await caller.agents.list();
  expect(catalog[0]?.availability).toBe('available');
  expect(discoverAgent).toHaveBeenCalledTimes(1);
});

it('refreshes every Agent before returning its current availability', async (): Promise<void> => {
  const first = createAgentMetadata(
    {
      discovery: [
        {
          result: {
            availability: 'not_signed_in',
            installStep: 'Sign in',
            configOptions: [],
          },
        },
        { result: availableAgentProbe },
      ],
    },
    'agent-one',
  );
  const second = createAgentMetadata(
    { discovery: [{ result: availableAgentProbe }] },
    'agent-two',
  );
  const discoverFirstAgent = vi.spyOn(first, 'probe');
  const discoverSecondAgent = vi.spyOn(second, 'probe');
  const { caller } = await startEngineTestHost({ adapters: [first, second] });
  await caller.agents.list();
  const catalog = await caller.agents.list({ refresh: true });
  expect(catalog.map(({ availability }) => availability)).toEqual([
    'available',
    'available',
  ]);
  expect(discoverFirstAgent).toHaveBeenCalledTimes(2);
  expect(discoverSecondAgent).toHaveBeenCalledTimes(2);
});

it('preserves Agent extension metadata in the public Agent catalog', async (): Promise<void> => {
  const firstAgent = agentCatalog[0];
  if (!firstAgent) throw new Error('Agent catalog is missing');
  const { caller } = await startEngineTestHost({
    adapters: [
      {
        ...createAgentMetadata(
          {
            discovery: [
              {
                result: {
                  availability: 'available',
                  configOptions: firstAgent.configOptions,
                },
              },
            ],
          },
          'agent-one',
        ),
        label: 'First Agent',
        logo: '<svg/>',
      },
    ],
  });
  expect(await caller.agents.list()).toEqual(agentCatalog);
});

it.each(['not_installed', 'not_signed_in'] as const)(
  'returns the %s installation guidance and current options',
  async (availability): Promise<void> => {
    const { caller } = await startEngineTestHost({
      adapters: [
        createAgentMetadata({
          discovery: [
            {
              result: {
                availability,
                installStep: 'Install or sign in',
                configOptions: [],
              },
            },
          ],
        }),
      ],
    });
    expect(await caller.agents.list()).toMatchObject([
      { availability, installStep: 'Install or sign in', configOptions: [] },
    ]);
  },
);

it('returns Agents in adapter order when later discovery finishes first', async (): Promise<void> => {
  const firstDiscovery = Promise.withResolvers<AgentProbe>();
  const { caller } = await startEngineTestHost({
    adapters: [
      createAgentMetadata(
        { discovery: [{ result: firstDiscovery.promise }] },
        'first',
      ),
      createAgentMetadata({}, 'second'),
    ],
  });
  const catalog = caller.agents.list();
  firstDiscovery.resolve(availableAgentProbe);
  expect((await catalog).map(({ agent }) => agent)).toEqual([
    'first',
    'second',
  ]);
});
