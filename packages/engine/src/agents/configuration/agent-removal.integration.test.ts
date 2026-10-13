import { access } from 'node:fs/promises';
import { expect, it } from 'vitest';
import {
  customAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';
import { startEngineTestHost } from '#mocks/engine';

it('custom unregister preserves the external executable and stored Session, Turn and Feed after restart', async () => {
  const host = await startCustomAgentEngine({ acp: {} });
  const registration = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registration.status !== 'ready') throw new Error(registration.failure);
  const input = {
    projectId: 'project-1',
    agent: registration.agentId,
    checkout: { type: 'main' as const },
    configOptions: [],
    prompt: [{ type: 'text' as const, text: 'Keep my history' }],
  };
  const created = await host.caller.session.new(input);
  await expect
    .poll(
      async () =>
        (await host.caller.feed.page({ ...created, direction: 'tail' })).rows,
      { timeout: 5000 },
    )
    .toContainEqual(
      expect.objectContaining({
        sessionUpdate: 'agent_message',
        state: 'settled',
      }),
    );
  await expect(
    host.caller.agents.remove({ agentId: registration.agentId }),
  ).rejects.toThrow('in use');
  await expect(
    host.caller.agents.editCustom({
      agentId: registration.agentId,
      definition: { ...customAgentDefinition, name: 'Changed' },
    }),
  ).rejects.toThrow('in use');
  await host.caller.session.close(created);
  const feed = await host.caller.feed.page({ ...created, direction: 'tail' });
  const sessions = await host.caller.session.list({
    projectId: 'project-1',
    archived: false,
  });
  await host.caller.agents.remove({ agentId: registration.agentId });
  await expect(
    access(customAgentDefinition.executable),
  ).resolves.toBeUndefined();
  expect(await host.caller.agents.configured()).toContainEqual(
    expect.objectContaining({
      id: registration.agentId,
      enabled: false,
      configuration: {
        source: 'custom',
        definition: customAgentDefinition,
        removed: true,
      },
    }),
  );
  await expect(host.caller.session.new(input)).rejects.toThrow(
    'cannot accept sessions.create',
  );
  await host.stop();
  const restarted = await startEngineTestHost({ home: host.home });
  expect(
    await restarted.caller.feed.page({ ...created, direction: 'tail' }),
  ).toEqual(feed);
  expect(
    await restarted.caller.session.list({
      projectId: 'project-1',
      archived: false,
    }),
  ).toEqual(sessions);
});
