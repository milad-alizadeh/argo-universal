import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  customAgentDefinition,
  gatedCustomAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

type Host = Awaited<ReturnType<typeof startCustomAgentEngine>>;

type Caller = Host['caller'];

type AgentList = Awaited<ReturnType<Caller['agents']['list']>>;

const released = 'release';

const renamed = 'Renamed custom Agent';

const launchChanges = [
  {
    name: 'removing',
    change: async (caller: Caller, agentId: string): Promise<void> => {
      await caller.agents.remove({ agentId });
    },
    committed: (agents: AgentList, agentId: string): void =>
      expect(agents).not.toContainEqual(
        expect.objectContaining({ agent: agentId }),
      ),
  },
  {
    name: 'editing',
    change: async (caller: Caller, agentId: string): Promise<void> => {
      await caller.agents.editCustom({
        agentId,
        definition: { ...customAgentDefinition, name: renamed },
      });
    },
    committed: (agents: AgentList, agentId: string): void =>
      expect(agents).toContainEqual(
        expect.objectContaining({
          agent: agentId,
          label: renamed,
          status: 'ready',
        }),
      ),
  },
];

// A real custom Agent program whose exit waits for the release file once the check stops it.
const stoppingCheck = async (
  host: Host,
): Promise<{
  agentId: string;
  checking: Promise<{ status: string }>;
  pid: number;
  release: string;
}> => {
  const marker = join(host.home, 'probe-pid');
  const release = join(host.home, 'probe-release');

  await writeFile(release, released);

  const registered = await host.caller.agents.registerCustom(
    gatedCustomAgentDefinition(marker, release),
  );

  if (registered.status !== 'ready') throw new Error(registered.failure);
  await rm(release);
  await rm(marker);
  onTestFinished(() => writeFile(release, released));

  const checking = host.caller.agents.recheck({ agentId: registered.agentId });

  await expect
    .poll(() => readFile(marker, 'utf8'), { timeout: 10_000 })
    .toMatch(/^\d+$/);

  const pid = Number(await readFile(marker, 'utf8'));

  return { agentId: registered.agentId, checking, pid, release };
};

it.each(launchChanges)(
  '$name a custom Agent during its readiness check waits for the checked program to exit, then commits',
  async ({ change, committed }) => {
    const host = await startCustomAgentEngine({ acp: {} });
    const { agentId, checking, pid, release } = await stoppingCheck(host);
    let settled = false;

    const changing = change(host.createCaller(), agentId).then(
      () => (settled = true),
    );

    await Promise.resolve();
    expect(settled).toBe(false);
    await writeFile(release, released);
    await changing;
    expect(() => process.kill(pid, 0)).toThrow(
      expect.objectContaining({ code: 'ESRCH' }),
    );
    expect(await checking).toEqual({ status: 'ready' });
    await vi.waitFor(async () =>
      committed(await host.caller.agents.list(), agentId),
    );
  },
  20_000,
);
