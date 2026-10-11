import { expect, it } from 'vitest';
import {
  customAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';
import { startEngineTestHost } from '#mocks/engine';

it('a custom ACP program that answers initialize is saved and survives an Engine restart', async () => {
  const host = await startCustomAgentEngine();
  const registration = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registration.status !== 'ready') throw new Error(registration.failure);
  await host.stop();
  const restarted = await startEngineTestHost({ home: host.home });
  const configured = await restarted.caller.agents.configured();
  expect(configured).toContainEqual({
    id: registration.agentId,
    enabled: true,
    configuration: { source: 'custom', definition: customAgentDefinition },
  });
});

it('a missing executable is refused with a precise failure and nothing is saved', async () => {
  const host = await startCustomAgentEngine();
  const executable = `/missing-argo-agent-${crypto.randomUUID()}`;
  await expect(
    host.caller.agents.registerCustom({
      ...customAgentDefinition,
      executable,
    }),
  ).resolves.toEqual({
    status: 'failed',
    failure: `${executable} was not found.`,
  });
  const configured = await host.caller.agents.configured();
  expect(configured.map(({ configuration }) => configuration.source)).toEqual([
    'registry',
    'registry',
  ]);
});

it('a program that exits before answering initialize is refused', async () => {
  const host = await startCustomAgentEngine();
  await expect(
    host.caller.agents.registerCustom({
      ...customAgentDefinition,
      args: ['-e', 'process.exit(3)'],
    }),
  ).resolves.toEqual({
    status: 'failed',
    failure: 'Fixture ACP exited before answering ACP initialize.',
  });
});

it('a credential-like environment variable is rejected at the boundary', async () => {
  const host = await startCustomAgentEngine();
  await expect(
    host.caller.agents.registerCustom({
      ...customAgentDefinition,
      env: [{ name: 'GEMINI_API_KEY', value: 'secret' }],
    }),
  ).rejects.toThrow('Argo does not store credentials');
});

it('readiness comes from a fresh check, not from the saved record', async () => {
  const host = await startCustomAgentEngine();
  const registration = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registration.status !== 'ready') throw new Error(registration.failure);
  const { agentId } = registration;
  await expect(host.caller.agents.check({ agentId })).resolves.toEqual({
    status: 'ready',
  });
  await expect(
    host.caller.agents.editCustom({
      agentId,
      definition: { ...customAgentDefinition, args: ['-e', ''] },
    }),
  ).resolves.toMatchObject({ status: 'failed' });
  await expect(host.caller.agents.check({ agentId })).resolves.toEqual({
    status: 'ready',
  });
});

it('a ready custom Agent opens and closes an empty Session through the shared ACP resource', async () => {
  const host = await startCustomAgentEngine();
  const registration = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registration.status !== 'ready') throw new Error(registration.failure);
  const created = await host.caller.session.new({
    projectId: 'project-1',
    agent: registration.agentId,
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [],
  });
  await host.caller.session.close(created);
  const { sessions } = await host.caller.session.list({
    projectId: 'project-1',
    archived: false,
  });
  expect(sessions).toContainEqual(
    expect.objectContaining({
      sessionId: created.sessionId,
      agent: registration.agentId,
    }),
  );
});

it('a disabled custom Agent keeps its record and history but admits no new Session', async () => {
  const host = await startCustomAgentEngine();
  const registration = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registration.status !== 'ready') throw new Error(registration.failure);
  const { agentId } = registration;
  await host.caller.agents.setEnabled({ agentId, enabled: false });
  await expect(
    host.caller.session.new({
      projectId: 'project-1',
      agent: agentId,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [],
    }),
  ).rejects.toThrow('cannot accept sessions.create');
  const configured = await host.caller.agents.configured();
  expect(configured).toContainEqual(
    expect.objectContaining({ id: agentId, enabled: false }),
  );
});
