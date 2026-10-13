import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import {
  customAgentDefinition,
  gatedCustomAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

type Caller = Awaited<ReturnType<typeof startCustomAgentEngine>>['caller'];
const queries = [
  {
    name: 'check',
    request: (caller: Caller, agentId: string): Promise<string> =>
      caller.agents.check({ agentId }).then(({ status }) => status),
    expected: 'ready',
  },
  {
    name: 'list',
    request: (caller: Caller, agentId: string): Promise<string | undefined> =>
      caller.agents
        .list()
        .then(
          (agents) =>
            agents.find((agent) => agent.agent === agentId)?.availability,
        ),
    expected: 'available',
  },
];

it.each(queries)(
  'concurrent $name shares custom readiness while management remains fenced',
  async ({ request, expected }) => {
    const host = await startCustomAgentEngine({ acp: {} });
    const marker = join(host.home, 'probe-pid');
    const release = join(host.home, 'probe-release');
    await writeFile(release, 'release');
    const registered = await host.caller.agents.registerCustom(
      gatedCustomAgentDefinition(marker, release),
    );
    if (registered.status !== 'ready') throw new Error(registered.failure);
    await rm(release);
    await rm(marker);
    onTestFinished(() => writeFile(release, 'release'));
    const input = { agentId: registered.agentId };
    const checking = host.caller.agents.check(input);
    await expect.poll(() => readFile(marker, 'utf8')).toMatch(/^\d+$/);
    const other = host.createCaller();
    const concurrent = request(other, registered.agentId).catch(
      (error: unknown) => error,
    );
    await expect(other.agents.remove(input)).rejects.toThrow('in use');
    await writeFile(release, 'release');
    expect(await checking).toEqual({ status: 'ready' });
    expect(await concurrent).toBe(expected);
  },
);

it('a queued readiness check observes removal instead of launching a stale definition', async () => {
  const host = await startCustomAgentEngine({ acp: {} });
  const registered = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registered.status !== 'ready') throw new Error(registered.failure);
  const input = { agentId: registered.agentId };
  const removal = host.caller.agents.remove(input);
  const checking = host.createCaller().agents.check(input);
  await removal;
  expect(await checking).toEqual({
    status: 'failed',
    failure: 'Agent was removed.',
  });
});

it('a listing queued behind an edit describes the committed definition', async () => {
  const host = await startCustomAgentEngine({ acp: {} });
  const registered = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registered.status !== 'ready') throw new Error(registered.failure);
  const marker = join(host.home, 'probe-pid');
  const release = join(host.home, 'probe-release');
  onTestFinished(() => writeFile(release, 'release'));
  const editing = host.caller.agents.editCustom({
    agentId: registered.agentId,
    definition: {
      ...gatedCustomAgentDefinition(marker, release),
      name: 'Renamed custom Agent',
    },
  });
  await expect.poll(() => readFile(marker, 'utf8')).toMatch(/^\d+$/);
  const listing = host.createCaller().agents.list();
  await writeFile(release, 'release');
  await editing;
  expect(await listing).toContainEqual(
    expect.objectContaining({
      agent: registered.agentId,
      label: 'Renamed custom Agent',
      availability: 'available',
    }),
  );
});
