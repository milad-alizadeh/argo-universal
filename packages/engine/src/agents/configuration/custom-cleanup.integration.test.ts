import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as after } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished } from 'vitest';
import {
  customAgentDefinition,
  gatedCustomAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

const cleanupFailure = 'process exit was not observed';

it('failed probe cleanup keeps management owned until the real process exits', async () => {
  const host = await startCustomAgentEngine({ acp: {} });

  const registered = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );

  if (registered.status !== 'ready') throw new Error(registered.failure);
  const marker = join(host.home, 'probe-pid');

  const definition = {
    ...customAgentDefinition,
    args: [
      '--import',
      fileURLToPath(
        new URL('../../../mocks/probe-lifetime.mjs', import.meta.url),
      ),
      ...customAgentDefinition.args,
    ],
    env: [{ name: 'ARGO_PROBE_EXIT_MARKER', value: marker }],
  };

  const pending = host.caller.agents.editCustom({
    agentId: registered.agentId,
    definition,
  });

  const failure = pending.catch((cause: unknown) => cause);
  await expect
    .poll(() => readFile(marker, 'utf8'), { timeout: 10_000 })
    .toMatch(/^\d+$/);
  const pid = Number(await readFile(marker, 'utf8'));
  onTestFinished(() => {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {}
  });
  expect(await failure).toMatchObject({
    message: expect.stringContaining(cleanupFailure),
  });
  await expect(
    host.caller.agents.remove({ agentId: registered.agentId }),
  ).rejects.toThrow('setup');
  process.kill(pid, 'SIGKILL');
  await expect
    .poll(async () => {
      try {
        await host.caller.agents.remove({ agentId: registered.agentId });

        return true;
      } catch {
        return false;
      }
    })
    .toBe(true);
}, 20_000);

it('shutdown waits for retained setup cleanup after the probe reports failure', async () => {
  const host = await startCustomAgentEngine({ acp: {} });

  const registered = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );

  if (registered.status !== 'ready') throw new Error(registered.failure);
  const marker = join(host.home, 'probe-pid');
  const release = join(host.home, 'probe-release');
  onTestFinished(() => writeFile(release, 'release'));

  const editing = host.caller.agents
    .editCustom({
      agentId: registered.agentId,
      definition: gatedCustomAgentDefinition(marker, release),
    })
    .catch((cause: unknown) => cause);

  await expect
    .poll(() => readFile(marker, 'utf8'), { timeout: 10_000 })
    .toMatch(/^\d+$/);
  const stopping = host.stop();
  expect(await editing).toMatchObject({
    message: expect.stringContaining(cleanupFailure),
  });

  try {
    expect(
      await Promise.race([
        stopping.then(() => 'stopped'),
        after(500, 'retained'),
      ]),
    ).toBe('retained');
  } finally {
    await writeFile(release, 'release');
    await stopping;
  }
}, 20_000);

it('shared readiness cleanup failure fences management until the process exits', async () => {
  const host = await startCustomAgentEngine({ acp: {} });
  const marker = join(host.home, 'probe-pid');
  const release = join(host.home, 'probe-release');
  onTestFinished(() => writeFile(release, 'release'));
  await writeFile(release, 'release');

  const registered = await host.caller.agents.registerCustom(
    gatedCustomAgentDefinition(marker, release),
  );

  if (registered.status !== 'ready') throw new Error(registered.failure);
  await rm(release);
  await rm(marker);
  const input = { agentId: registered.agentId };

  const checking = host.caller.agents.recheck(input);

  await expect
    .poll(() => readFile(marker, 'utf8'), { timeout: 10_000 })
    .toMatch(/^\d+$/);
  const pid = Number(await readFile(marker, 'utf8'));
  onTestFinished(() => {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {}
  });

  const other = host.createCaller().agents.recheck(input);

  const failed = {
    status: 'cant-start',
    reason: 'The Agent did not exit after its readiness check.',
  };

  expect(await checking).toEqual(failed);
  expect(await other).toEqual(failed);
  expect(await host.caller.agents.list()).toContainEqual(
    expect.objectContaining({ agent: registered.agentId, ...failed }),
  );
  await expect(host.caller.agents.remove(input)).rejects.toThrow('in use');
  process.kill(pid, 'SIGKILL');
  await expect
    .poll(() =>
      host.caller.agents.remove(input).then(
        () => true,
        () => false,
      ),
    )
    .toBe(true);
}, 20_000);
