import { expect, it } from 'vitest';
import { loginOwner } from '#mocks/agent-login';
import {
  installEntry,
  installationExecutable,
  installationPorts,
  startInstallEngine,
} from '#mocks/installation';

it('two Apps cannot own competing installations', async () => {
  const requested = Promise.withResolvers<void>();
  const download = Promise.withResolvers<Uint8Array>();

  const host = await startInstallEngine(installEntry('binary'), {
    ...installationPorts,
    download: async () => {
      requested.resolve();

      return download.promise;
    },
  });

  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await requested.promise;

  try {
    await expect(
      host.caller.agents.startLogin({
        agentId: host.agentId,
        ownerToken: loginOwner,
      }),
    ).rejects.toThrow('in use by setup');
    expect(
      await host
        .createCaller()
        .agents.install({ agentId: host.agentId, version: '1.2.3' }),
    ).toMatchObject({
      status: 'failed',
      failure: expect.stringContaining('in use'),
    });
  } finally {
    download.resolve(installationExecutable);
  }

  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: host.agentId }))
          .operation?.status,
    )
    .toBe('installed');
});

it('cancellation remains pending until external cleanup finishes', async () => {
  const requested = Promise.withResolvers<AbortSignal>();
  const download = Promise.withResolvers<Uint8Array>();

  const host = await startInstallEngine(installEntry('binary'), {
    ...installationPorts,
    download: async (_, signal) => {
      requested.resolve(signal);

      return download.promise;
    },
  });

  const first = await host.caller.agents.install({
    agentId: host.agentId,
    version: '1.2.3',
  });

  const signal = await requested.promise;
  let settled = false;

  const cancelled = host.caller.agents
    .cancelInstall({ agentId: host.agentId, operationId: first.operationId })
    .then(() => {
      settled = true;
    });

  await expect.poll(() => signal.aborted).toBe(true);
  expect(settled).toBe(false);
  expect(
    (await host.caller.agents.installStatus({ agentId: host.agentId }))
      .operation?.status,
  ).toBe('installing');
  download.reject(signal.reason);
  await cancelled;
  await expect(
    host.caller.agents.installStatus({ agentId: host.agentId }),
  ).resolves.toMatchObject({
    installation: { status: 'not-installed' },
    operation: { status: 'cancelled' },
  });
});

it('Engine shutdown observes installation cleanup before closing storage', async () => {
  const requested = Promise.withResolvers<AbortSignal>();
  const download = Promise.withResolvers<Uint8Array>();

  const host = await startInstallEngine(installEntry('binary'), {
    ...installationPorts,
    download: async (_, signal) => {
      requested.resolve(signal);

      return download.promise;
    },
  });

  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  const signal = await requested.promise;
  let stopped = false;

  const stopping = host.stop().then(() => {
    stopped = true;
  });

  await expect.poll(() => signal.aborted).toBe(true);
  expect(stopped).toBe(false);
  download.reject(signal.reason);
  await stopping;
  expect(host.engine.getSnapshot().output).toEqual({ exitCode: 0 });
});

it('retry after cancellation installs a new owned selection', async () => {
  let calls = 0;

  const host = await startInstallEngine(installEntry('binary'), {
    ...installationPorts,
    download: async () => {
      if (++calls === 1) throw new Error('Download interrupted');

      return installationExecutable;
    },
  });

  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: host.agentId }))
          .operation?.status,
    )
    .toBe('failed');
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: host.agentId }))
          .operation?.status,
    )
    .toBe('installed');
});
