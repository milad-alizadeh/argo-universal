import type { SessionNotification } from '@agentclientprotocol/sdk';
import { scriptedAgentCommand } from '@repo/mocks/agent/scripted-agent-launch';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  createResourceDestination,
  createResourceOpening,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';

const readProcessId = (sessionId: string): number =>
  Number(sessionId.split(':')[0]);

it('the production launch port owns a real stdio process and observes its final exit', async () => {
  const base = createResourceOpening();
  const resources = createAcpResources();
  onTestFinished(() => resources.shutdown());
  vi.stubEnv('ARGO_AMBIENT_VALUE', 'ambient');
  vi.stubEnv('NODE_ENV', 'test');

  const lease = await resources.open({
    ...base,
    launch: {
      ...base.launch,
      ...scriptedAgentCommand('reply'),
      cwd: process.cwd(),
      env: { ARGO_LAUNCH_VALUE: 'captured' },
    },
  });

  expect(lease.initialization.protocolVersion).toBe(1);
  const environment = lease.initialization._meta?.['environment'];
  expect(environment).toMatchObject({ ARGO_LAUNCH_VALUE: 'captured' });
  expect(process.kill(readProcessId(lease.sessionId), 0)).toBe(true);
  await lease.close();
  await lease.released;
  expect(process.kill(readProcessId(lease.sessionId), 0)).toBe(true);
  await resources.shutdown();
  expect(() => process.kill(readProcessId(lease.sessionId), 0)).toThrow(
    'ESRCH',
  );
});

it.each([1, 4, 8])(
  '%i concurrent Sessions share one real Agent process, each receives only its own updates, and the last close keeps it alive',
  async (count) => {
    const resources = createAcpResources();
    onTestFinished(() => resources.shutdown());
    const base = createResourceOpening();

    const launch = {
      ...base.launch,
      ...scriptedAgentCommand('reply'),
      cwd: process.cwd(),
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
    expect(process.kill(agentProcess, 0)).toBe(true);
    await resources.shutdown();
    expect(() => process.kill(agentProcess, 0)).toThrow('ESRCH');
  },
);

it('a real Agent exit reports its status and final stderr block', async () => {
  const resources = createAcpResources();
  onTestFinished(() => resources.shutdown());
  const failure = Promise.withResolvers<unknown>();

  const base = createResourceOpening({
    ...createResourceDestination(),
    failed: failure.resolve,
  });

  const lease = await resources.open({
    ...base,
    launch: {
      ...base.launch,
      ...scriptedAgentCommand('exit-with-stderr'),
      cwd: process.cwd(),
    },
  });

  const prompt = lease.agent.request('session/prompt', {
    sessionId: lease.sessionId,
    prompt: [{ type: 'text', text: 'Exit' }],
  });

  void prompt.catch(() => {});
  await expect(failure.promise).resolves.toMatchObject({
    message: 'Agent exited with status 17',
    stderr: 'Agent fixture failed',
  });
  await expect(prompt).rejects.toThrow(/closed|exit|stream/i);
});
