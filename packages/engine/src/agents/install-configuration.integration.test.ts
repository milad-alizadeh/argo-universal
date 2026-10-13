import { expect, it } from 'vitest';
import { customAgentDefinition } from '#mocks/custom-agent';
import { startInstallEngine } from '#mocks/installation';
import {
  rejectInstallationWrites,
  waitForInstalledSelection,
} from '#mocks/installation-storage';
import { writeDatabaseJobAndWaitForCommit } from '../storage';
import { AgentConfigurationSaveJob } from './agent-storage';

it('reserves pending enablement until its real Writer retry commits', async () => {
  const host = await startInstallEngine();
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await waitForInstalledSelection(host);
  rejectInstallationWrites(host);
  let settled = false;

  const enablement = host.caller.agents
    .setEnabled({ agentId: host.agentId, enabled: false })
    .then(() => {
      settled = true;
    });

  await expect
    .poll(() => host.databaseWriter.getSnapshot().matches('waitingToRetry'), {
      timeout: 5000,
    })
    .toBe(true);
  expect(settled).toBe(false);
  expect(
    await host
      .createCaller()
      .agents.install({ agentId: host.agentId, version: '1.2.3' }),
  ).toMatchObject({
    status: 'failed',
    failure: expect.stringContaining('in use'),
  });
  host.database.$client.exec('DROP TRIGGER reject_configuration');
  await enablement;
  expect(await host.caller.agents.configured()).toContainEqual(
    expect.objectContaining({ id: host.agentId, enabled: false }),
  );
});

it('reserves a custom edit until its checked definition commits through Writer retry', async () => {
  const host = await startInstallEngine();
  await writeDatabaseJobAndWaitForCommit(
    host.databaseWriter,
    new AgentConfigurationSaveJob({
      id: host.agentId,
      enabled: true,
      configuration: JSON.stringify({
        source: 'custom',
        definition: customAgentDefinition,
      }),
    }),
  );
  rejectInstallationWrites(host);
  const definition = { ...customAgentDefinition, name: 'Edited fixture' };

  const edited = host.caller.agents.editCustom({
    agentId: host.agentId,
    definition,
  });

  await expect
    .poll(() => host.databaseWriter.getSnapshot().matches('waitingToRetry'), {
      timeout: 5000,
    })
    .toBe(true);
  expect(
    await host
      .createCaller()
      .agents.install({ agentId: host.agentId, version: '1.2.3' }),
  ).toMatchObject({
    status: 'failed',
    failure: expect.stringContaining('in use'),
  });
  host.database.$client.exec('DROP TRIGGER reject_configuration');
  await expect(edited).resolves.toMatchObject({ status: 'ready' });
  expect(await host.caller.agents.configured()).toContainEqual(
    expect.objectContaining({
      id: host.agentId,
      configuration: { source: 'custom', definition },
    }),
  );
});
