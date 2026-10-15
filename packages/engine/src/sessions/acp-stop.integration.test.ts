import type { PromptRequest } from '@agentclientprotocol/sdk';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';

it('Stop ends an ignored cancel immediately, queues the next Send until the old prompt answers, and Close still closes', async () => {
  const oldPrompt = Promise.withResolvers<void>();
  const entered = Promise.withResolvers<void>();
  const prompts: PromptRequest[] = [];

  const host = await startAcpEngine({
    ...scenarios['ignores-cancel'],
    responses: {
      'session/prompt': [
        {
          requests: prompts,
          steps: [{ type: 'gate', waitFor: oldPrompt.promise, entered }],
          error: 'Cancelled prompt failed',
        },
        { requests: prompts },
      ],
    },
  });

  const session = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'First' }],
  });
  await entered.promise;
  await host.caller.session.cancel(session);
  await waitForAcpSnapshot(
    host,
    session.sessionId,
    (snapshot) => snapshot.state === 'idle' && snapshot.activeTurnId === null,
  );
  expect(
    host.database.$client
      .prepare('SELECT status, stop_reason FROM turn WHERE session_id = ?')
      .get(session.sessionId),
  ).toEqual({ status: 'ended', stop_reason: 'cancelled' });
  let committed = false;

  const next = host.caller.session
    .prompt({ ...session, prompt: [{ type: 'text', text: 'Second' }] })
    .then(() => {
      committed = true;
    });

  await vi.waitFor(() => expect(prompts).toHaveLength(1));
  expect(committed).toBe(false);
  oldPrompt.resolve();
  await next;
  await vi.waitFor(() => expect(prompts).toHaveLength(2));
  const page = await host.caller.feed.page({ ...session, direction: 'tail' });
  expect(
    page.rows.filter((row) => row.sessionUpdate === 'user_message'),
  ).toHaveLength(2);
  await host.caller.session.cancel(session);
  await host.caller.session.close(session);
  expect(host.agent.processes).toHaveLength(1);
  expect(host.agent.processes[0]?.terminations).toBe(0);
});
