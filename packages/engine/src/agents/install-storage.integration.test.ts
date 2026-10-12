import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import {
  installationExecutable,
  startInstallEngine,
} from '#mocks/installation';
import {
  rejectInstallationWrites,
  waitForInstalledSelection,
} from '#mocks/installation-storage';
import { readInstallSelection } from './index';
import { selectedLaunchDefinition } from './install/selection/selection';
it.each(['completion', 'cancellation'])(
  'retains installation ownership through Writer retry during %s',
  async (outcome) => {
    const host = await startInstallEngine();
    rejectInstallationWrites(host);
    const operation = await host.caller.agents.install({
      agentId: host.agentId,
      version: '1.2.3',
    });
    await expect
      .poll(() => host.databaseWriter.getSnapshot().matches('waitingToRetry'), {
        timeout: 5000,
      })
      .toBe(true);
    expect(readInstallSelection(host.database, host.agentId)).toBeUndefined();
    expect(
      (await host.caller.agents.installStatus({ agentId: host.agentId }))
        .operation?.status,
    ).toBe('installing');
    expect(
      await host
        .createCaller()
        .agents.install({ agentId: host.agentId, version: '1.2.3' }),
    ).toMatchObject({
      status: 'failed',
      failure: expect.stringContaining('in use'),
    });
    let cancelled = false;
    const cancellation =
      outcome === 'cancellation'
        ? host.caller.agents
            .cancelInstall({
              agentId: host.agentId,
              operationId: operation.operationId,
            })
            .then(() => {
              cancelled = true;
            })
        : undefined;
    expect(cancelled).toBe(false);
    host.database.$client.exec('DROP TRIGGER reject_configuration');
    await cancellation;
    await waitForInstalledSelection(host);
    const selection = readInstallSelection(host.database, host.agentId);
    if (!selection) throw new Error('Expected committed selection');
    const launch = await selectedLaunchDefinition(
      host.home,
      host.agentId,
      selection,
    );
    expect(await readFile(launch.args[0] ?? launch.executable)).toEqual(
      installationExecutable,
    );
  },
);
