import { expect, it } from 'vitest';
import { startArchiveInstallEngine } from '#mocks/archive-installation';

it.each(['.installer-group.json', './.installer-group.json.pending'])(
  'rejects archive entry %s that collides with installer ownership metadata',
  async (name) => {
    const host = await startArchiveInstallEngine(name);
    await expect
      .poll(
        async () =>
          (await host.caller.agents.installStatus({ agentId: host.agentId }))
            .operation,
      )
      .toMatchObject({
        status: 'failed',
        failure: expect.stringContaining('reserved'),
      });
  },
);
