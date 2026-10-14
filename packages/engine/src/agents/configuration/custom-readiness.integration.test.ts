import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import {
  customAgentDefinition,
  gatedCustomAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

const markerName = 'probe-pid';

const releaseName = 'probe-release';

type Caller = Awaited<ReturnType<typeof startCustomAgentEngine>>['caller'];

const queries = [
  {
    name: 'Recheck shares',
    request: (caller: Caller, agentId: string): Promise<string> =>
      caller.agents.recheck({ agentId }).then(({ status }) => status),
    expected: 'ready',
  },
  {
    name: 'listing shows Checking… during',
    request: (caller: Caller, agentId: string): Promise<string | undefined> =>
      caller.agents
        .list()
        .then(
          (agents) => agents.find((agent) => agent.agent === agentId)?.status,
        ),
    expected: 'checking',
  },
];

it.each(queries)(
  'a concurrent $name custom readiness',
  async ({ request, expected }) => {
    const host = await startCustomAgentEngine({ acp: {} });
    const marker = join(host.home, markerName);
    const release = join(host.home, releaseName);
    await writeFile(release, 'release');

    const registered = await host.caller.agents.registerCustom(
      gatedCustomAgentDefinition(marker, release),
    );

    if (registered.status !== 'ready') throw new Error(registered.failure);
    await rm(release);
    await rm(marker);
    onTestFinished(() => writeFile(release, 'release'));
    const input = { agentId: registered.agentId };
    const checking = host.caller.agents.recheck(input);
    await expect
      .poll(() => readFile(marker, 'utf8'), { timeout: 10_000 })
      .toMatch(/^\d+$/);
    const other = host.createCaller();

    const concurrent = request(other, registered.agentId).catch(
      (cause: unknown) => cause,
    );

    await writeFile(release, 'release');
    expect(await checking).toEqual({ status: 'ready' });
    expect(await concurrent).toBe(expected);
  },
  20_000,
);

it('a queued readiness check observes removal instead of launching a stale definition', async () => {
  const host = await startCustomAgentEngine({ acp: {} });

  const registered = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );

  if (registered.status !== 'ready') throw new Error(registered.failure);
  const input = { agentId: registered.agentId };
  const removal = host.caller.agents.remove(input);
  const checking = host.createCaller().agents.recheck(input);
  await removal;
  await expect(checking).rejects.toThrow('Agent was removed.');
  expect(await host.caller.agents.list()).not.toContainEqual(
    expect.objectContaining({ agent: registered.agentId }),
  );
}, 20_000);

it('a Recheck queued behind an edit checks the committed definition', async () => {
  const host = await startCustomAgentEngine({ acp: {} });

  const registered = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );

  if (registered.status !== 'ready') throw new Error(registered.failure);
  const marker = join(host.home, markerName);
  const release = join(host.home, releaseName);
  onTestFinished(() => writeFile(release, 'release'));

  const editing = host.caller.agents.editCustom({
    agentId: registered.agentId,
    definition: {
      ...gatedCustomAgentDefinition(marker, release),
      name: 'Renamed custom Agent',
    },
  });

  await expect
    .poll(() => readFile(marker, 'utf8'), { timeout: 10_000 })
    .toMatch(/^\d+$/);

  const checking = host
    .createCaller()
    .agents.recheck({ agentId: registered.agentId });

  await writeFile(release, 'release');
  await editing;
  expect(await checking).toEqual({ status: 'ready' });
  expect(await host.caller.agents.list()).toContainEqual(
    expect.objectContaining({
      agent: registered.agentId,
      label: 'Renamed custom Agent',
      status: 'ready',
    }),
  );
}, 20_000);

it('enablement waits for readiness cleanup and then commits the requested setting', async () => {
  const host = await startCustomAgentEngine({ acp: {} });
  const marker = join(host.home, markerName);
  const release = join(host.home, releaseName);
  await writeFile(release, 'release');

  const registered = await host.caller.agents.registerCustom(
    gatedCustomAgentDefinition(marker, release),
  );

  if (registered.status !== 'ready') throw new Error(registered.failure);
  await rm(release);
  await rm(marker);
  onTestFinished(() => writeFile(release, 'release'));
  const input = { agentId: registered.agentId };
  const checking = host.caller.agents.recheck(input);
  await expect
    .poll(() => readFile(marker, 'utf8'), { timeout: 10_000 })
    .toMatch(/^\d+$/);

  const disabling = host
    .createCaller()
    .agents.setEnabled({ ...input, enabled: false });

  expect(await host.caller.agents.configured()).toContainEqual(
    expect.objectContaining({ id: registered.agentId, enabled: true }),
  );
  await writeFile(release, 'release');
  await checking;
  await disabling;
  expect(await host.caller.agents.configured()).toContainEqual(
    expect.objectContaining({ id: registered.agentId, enabled: false }),
  );
}, 20_000);
