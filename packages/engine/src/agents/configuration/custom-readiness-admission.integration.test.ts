import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { loginOwner } from '#mocks/agent-login';
import {
  gatedCustomAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

type Host = Awaited<ReturnType<typeof startCustomAgentEngine>>;

async function openSession(host: Host, agentId: string): Promise<string> {
  const [project] = await host.caller.projects.list();

  if (!project) throw new Error('The fixture Project is missing');

  const created = await host.createCaller().session.new({
    projectId: project.id,
    agent: agentId,
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [{ type: 'text', text: 'Use the healthy Agent' }],
  });

  return created.sessionId;
}

async function openLogin(host: Host, agentId: string): Promise<string> {
  const caller = host.createCaller();

  const started = await caller.agents.startLogin({
    agentId,
    ownerToken: loginOwner,
  });

  const operation = {
    operationId: started.operationId,
    ownerToken: loginOwner,
  };

  await expect
    .poll(async () => (await caller.agents.login(operation)).status, {
      timeout: 5000,
    })
    .toBe('choose-method');

  return started.operationId;
}

const openings = [
  { name: 'Session', scenario: 'reply' as const, open: openSession },
  { name: 'sign-in', scenario: 'protocol-login' as const, open: openLogin },
];

it.each(openings)(
  'a running Recheck permits $name opening while replacement remains fenced',
  async ({ open, scenario }) => {
    const host = await startCustomAgentEngine({ acp: {} });
    const marker = join(host.home, 'probe-pid');
    const release = join(host.home, 'probe-release');
    onTestFinished(() => writeFile(release, 'release'));
    await writeFile(release, 'release');

    const registered = await host.caller.agents.registerCustom(
      gatedCustomAgentDefinition(marker, release, scenario),
    );

    if (registered.status !== 'ready') throw new Error(registered.failure);
    await rm(release);
    await rm(marker);

    const checking = host
      .createCaller()
      .agents.recheck({ agentId: registered.agentId });

    await expect
      .poll(() => readFile(marker, 'utf8'), { timeout: 10_000 })
      .toMatch(/^\d+$/);
    await expect(
      host.caller.agents.remove({ agentId: registered.agentId }),
    ).rejects.toThrow('in use');

    try {
      expect(await open(host, registered.agentId)).toMatch(/^[\da-f-]{36}$/);
    } finally {
      await writeFile(release, 'release');
    }

    expect(await checking).toEqual({ status: 'ready' });
  },
  15000,
);
