import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished } from 'vitest';
import {
  customAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

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
  const failure = pending.catch((error: unknown) => error);
  await expect.poll(() => readFile(marker, 'utf8')).toMatch(/^\d+$/);
  const pid = Number(await readFile(marker, 'utf8'));
  onTestFinished(() => {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {}
  });
  expect(await failure).toMatchObject({
    message: expect.stringContaining('process exit was not observed'),
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
}, 15000);
