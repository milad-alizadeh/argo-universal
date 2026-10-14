import type { MachineTools } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { machineWithout, type Omitted } from '#mocks/machine-tools';

it.each<[Omitted, MachineTools]>([
  ['node', { node: false, uv: true }],
  ['npm', { node: false, uv: true }],
  ['uv', { node: true, uv: false }],
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
