import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it('a saved Registry Agent launches lazily and sends a prompt through the Engine', async () => {
  const host = await startAcpEngine({ steps: [] });
  expect(host.agent.processes).toHaveLength(0);

  const session = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Use the saved Agent' }],
  });

  expect(session.sessionId).toEqual(expect.any(String));
  expect(host.agent.processes).toHaveLength(1);
  expect(await host.caller.agents.servers()).toMatchObject([{ id: 'mock' }]);
});

it('Remove preserves Session history and Send reports the removed Agent', async () => {
  const host = await startAcpEngine({ steps: [] });

  const session = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Keep this history' }],
  });

  await host.caller.agents.remove({ id: 'mock' });
  expect(await host.caller.agents.servers()).toEqual([]);
  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toContainEqual(
    expect.objectContaining({ sessionId: session.sessionId, agent: 'mock' }),
  );
  await expect(
    host.caller.session.prompt({
      ...session,
      prompt: [{ type: 'text', text: 'Continue' }],
    }),
  ).rejects.toMatchObject({
    message: 'Agent "mock" is not installed.',
    cause: {
      openError: { type: 'failed', message: 'Agent "mock" is not installed.' },
    },
  });
});
