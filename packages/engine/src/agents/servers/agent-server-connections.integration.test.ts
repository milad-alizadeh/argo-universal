import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, vi } from 'vitest';
import { createResourceOpening } from '#mocks/acp-resource';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import type { AcpOpenInput, AcpResources, AcpSessionLease } from '../index';

const exampleAgentId = 'example-agent';

const mutations = ['addRegistry', 'remove'] as const;

type Mutation = (typeof mutations)[number];

type MutatedAgent = {
  host: Awaited<ReturnType<typeof startEngineTestHost>>;
  scripted: ReturnType<typeof scriptedEngineInput>;
  resources: AcpResources;
  opening: AcpOpenInput;
  first: AcpSessionLease;
};

// A saved Agent with one open Session, after `mutation` drops its reusable connection.
const mutateOpenAgent = async (mutation: Mutation): Promise<MutatedAgent> => {
  const scripted = scriptedEngineInput();

  const host = await startEngineTestHost({
    ...scripted,
    fetchAgents: async () => JSON.stringify(publishedRegistry),
  });

  await host.caller.agents.refreshRegistry();
  await host.caller.agents.addRegistry({ id: exampleAgentId });
  const resources = host.engine.getSnapshot().context.acpResources;
  const opening = createResourceOpening();
  opening.launch = { ...opening.launch, agentId: exampleAgentId };
  const first = await resources.open(opening);
  await host.caller.agents[mutation]({ id: exampleAgentId });

  return { host, scripted, resources, opening, first };
};

const terminations = ({ scripted }: MutatedAgent): number[] =>
  scripted.agent.processes.map((process) => process.terminations);

it.each(mutations)(
  '%s keeps an open Session working on its dropped connection',
  async (mutation) => {
    const { first } = await mutateOpenAgent(mutation);
    expect(
      await first.agent.request('session/prompt', {
        sessionId: first.sessionId,
        prompt: [],
      }),
    ).toEqual({ stopReason: 'end_turn' });
  },
);

it.each(mutations)(
  '%s starts a new process for the next Session',
  async (mutation) => {
    const mutated = await mutateOpenAgent(mutation);
    await mutated.resources.open(mutated.opening);
    expect(terminations(mutated)).toEqual([0, 0]);
  },
);

it.each(mutations)(
  '%s retires the dropped process after its last Session closes',
  async (mutation) => {
    const mutated = await mutateOpenAgent(mutation);
    const second = await mutated.resources.open(mutated.opening);
    await Promise.all([mutated.first.close(), second.close()]);
    await vi.waitFor(() => expect(terminations(mutated)).toEqual([1, 0]));
  },
);

it.each(mutations)(
  '%s keeps an idle replacement process until Engine stop',
  async (mutation) => {
    const mutated = await mutateOpenAgent(mutation);
    const second = await mutated.resources.open(mutated.opening);
    await Promise.all([mutated.first.close(), second.close()]);
    await vi.waitFor(() => expect(terminations(mutated)).toEqual([1, 0]));
    await mutated.host.stop();
    expect(terminations(mutated)).toEqual([1, 1]);
  },
);
