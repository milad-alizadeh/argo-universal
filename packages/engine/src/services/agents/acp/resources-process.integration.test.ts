import { fileURLToPath } from 'node:url';
import type { SessionNotification } from '@agentclientprotocol/sdk';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  createResourceDestination,
  createResourceOpening,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';

const readProcessId = (sessionId: string): number =>
  Number(sessionId.split(':')[0]);
const agentScript = fileURLToPath(
  new URL('../../../../mocks/acp-process.mts', import.meta.url),
);

it('a missing executable rejects opening and releases the production resource after child closure', async () => {
  const resources = createAcpResources();
  const failures: unknown[] = [];
  const base = createResourceOpening({
    ...createResourceDestination(),
    failed: (error) => {
      failures.push(error);
    },
  });
  const executable = `/missing-argo-agent-${crypto.randomUUID()}`;
  const input = {
    ...base,
    launch: { ...base.launch, executable, cwd: process.cwd() },
  };
  const opening = resources.open(input);
  void opening.catch(() => {});
  await vi.waitFor(() =>
    expect(failures).toContainEqual(
      expect.objectContaining({ code: 'ENOENT' }),
    ),
  );
  await expect(opening).rejects.toMatchObject({
    code: 'ENOENT',
    path: executable,
  });
  await expect(resources.open(input)).rejects.toMatchObject({
    code: 'ENOENT',
    path: executable,
  });
  await expect(resources.shutdown()).resolves.toBeUndefined();
});

it('the production launch port owns a real stdio process and observes its final exit', async () => {
  const base = createResourceOpening();
  const resources = createAcpResources();
  onTestFinished(() => resources.shutdown());
  vi.stubEnv('ARGO_348_AMBIENT', 'ambient');
  vi.stubEnv('NODE_ENV', 'test');
  const lease = await resources.open({
    ...base,
    launch: {
      ...base.launch,
      executable: process.execPath,
      cwd: process.cwd(),
      env: { ARGO_348_PRESENT: 'captured' },
      args: [agentScript],
    },
  });
  expect(lease.initialization.protocolVersion).toBe(1);
  expect(lease.initialization._meta).toEqual({
    present: 'captured',
    ambient: null,
    nodeEnv: null,
  });
  expect(process.kill(readProcessId(lease.sessionId), 0)).toBe(true);
  await lease.close();
  await lease.released;
  expect(() => process.kill(readProcessId(lease.sessionId), 0)).toThrow(
    'ESRCH',
  );
});

it.each([1, 4, 8])(
  '%i concurrent Sessions share one real Agent process, each receives only its own updates, and the last close ends it',
  async (count) => {
    const resources = createAcpResources();
    onTestFinished(() => resources.shutdown());
    const base = createResourceOpening();
    const launch = {
      ...base.launch,
      executable: process.execPath,
      cwd: process.cwd(),
      args: [agentScript],
    };
    const updates = Array.from(
      { length: count },
      (): SessionNotification[] => [],
    );
    const leases = await Promise.all(
      updates.map((received) =>
        resources.open({
          ...base,
          launch,
          destination: createResourceDestination(received),
        }),
      ),
    );
    await Promise.all(
      leases.map((lease) =>
        lease.agent.request('session/prompt', {
          sessionId: lease.sessionId,
          prompt: [{ type: 'text', text: 'Start' }],
        }),
      ),
    );
    const [last, ...others] = leases;
    if (!last) throw new Error('No Session opened');
    const agentProcess = readProcessId(last.sessionId);
    await Promise.all(others.map((lease) => lease.close()));
    const aliveWithOneSession = process.kill(agentProcess, 0);
    await last.close();
    expect({
      processes: new Set(leases.map((lease) => readProcessId(lease.sessionId)))
        .size,
      updates: updates.map((received) =>
        received.map((update) => update.sessionId),
      ),
      aliveWithOneSession,
    }).toEqual({
      processes: 1,
      updates: leases.map((lease) => [lease.sessionId]),
      aliveWithOneSession: true,
    });
    expect(() => process.kill(agentProcess, 0)).toThrow('ESRCH');
  },
);
