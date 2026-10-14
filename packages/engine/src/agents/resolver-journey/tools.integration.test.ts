import { join, relative } from 'node:path';
import type { InstallTool, MachineTools } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installationPorts } from '#mocks/installation';
import { createMachinePath, type MachinePath } from '#mocks/machine-path';
import type { InstallPorts, InstallToolInput } from '../../agents';

type Omitted = 'node' | 'npm' | 'uv' | 'brew';
// Puts every tool on PATH except the omitted one; Node.js itself comes from the test PATH unless omitted.
const machineWithout = async (omitted?: Omitted): Promise<MachinePath> => {
  const machine = await createMachinePath({ node: omitted !== 'node' });
  for (const tool of ['npm', 'uv', 'brew'] as const)
    if (tool !== omitted) await machine.place(tool);
  return machine;
};

it.each<[Omitted, MachineTools]>([
  ['node', { node: false, uv: true, brew: true }],
  ['npm', { node: false, uv: true, brew: true }],
  ['uv', { node: true, uv: false, brew: true }],
  ['brew', { node: true, uv: true, brew: false }],
])(
  'with %s omitted from PATH, the Resolver reports which tools are on this machine',
  async (omitted, expected) => {
    await machineWithout(omitted);
    const host = await startEngineTestHost();
    expect(await host.caller.agents.tools()).toEqual(expected);
  },
);

it('a tool installed in a terminal is found by the next look, with no restart', async () => {
  const machine = await machineWithout('uv');
  const host = await startEngineTestHost();
  expect((await host.caller.agents.tools()).uv).toBe(false);
  await machine.place('uv');
  expect((await host.caller.agents.tools()).uv).toBe(true);
});

// Homebrew is the external installer: its fixture puts the tool's files on PATH, as `brew install` would.
const homebrew = (
  machine: MachinePath,
  outcome: (input: InstallToolInput) => Promise<void>,
): InstallPorts & { runs: InstallToolInput[] } => {
  const runs: InstallToolInput[] = [];
  return {
    ...installationPorts,
    runs,
    runTool: async (input) => {
      runs.push(input);
      await outcome(input);
      return '';
    },
  };
};
const installedFiles: Record<InstallTool, Omitted> = { node: 'npm', uv: 'uv' };

it.each<InstallTool>(['node', 'uv'])(
  'installing %s with Homebrew runs `brew install` through the installer port, then finds it',
  async (tool) => {
    const machine = await machineWithout(installedFiles[tool]);
    const ports = homebrew(machine, async () => {
      await machine.place(installedFiles[tool]);
    });
    const host = await startEngineTestHost({ installationPorts: ports });
    expect((await host.caller.agents.tools())[tool]).toBe(false);
    expect(await host.caller.agents.installTool({ tool })).toMatchObject({
      [tool]: true,
    });
    expect(
      ports.runs.map(({ executable, args }) => [executable, args]),
    ).toEqual([['brew', ['install', tool]]]);
    expect(
      relative(join(host.home, 'agents'), ports.runs[0]?.cwd ?? ''),
    ).not.toMatch(/^\.\./);
    expect((await host.caller.agents.tools())[tool]).toBe(true);
  },
);

it('a failed Homebrew install reports its reason and the tool stays missing', async () => {
  const machine = await machineWithout('npm');
  const ports = homebrew(machine, () =>
    Promise.reject(new Error('brew failed to install Node.js: no bottle')),
  );
  const host = await startEngineTestHost({ installationPorts: ports });
  await expect(
    host.caller.agents.installTool({ tool: 'node' }),
  ).rejects.toThrow('no bottle');
  expect((await host.caller.agents.tools()).node).toBe(false);
});

it('without Homebrew on PATH, Argo installs nothing', async () => {
  const machine = await machineWithout('brew');
  await machine.remove('uv');
  const ports = homebrew(machine, async () => {});
  const host = await startEngineTestHost({ installationPorts: ports });
  await expect(host.caller.agents.installTool({ tool: 'uv' })).rejects.toThrow(
    'Homebrew',
  );
  expect(ports.runs).toEqual([]);
});
