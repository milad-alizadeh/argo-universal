import { expect, it, onTestFinished } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { insertSession } from '#mocks/database';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { startSessionJourney } from '#mocks/session-journey';

it('prompts and cancels through tRPC, with the same Session reopened only once', async (): Promise<void> => {
  const host = await startSessionJourney();
  const { caller, agent, openings } = host;
  const { messageId } = await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Hello' }],
  });
  const process = requireScriptedProcessAt(agent.processes);
  expect(
    await caller.feed.row({ sessionId: 'session-1', id: messageId }),
  ).toMatchObject({ content: [{ type: 'text', text: 'Hello' }] });
  await expect(
    caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Again' }],
    }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: expect.stringContaining('cannot accept'),
  });
  expect(await caller.session.cancel({ sessionId: 'session-1' })).toEqual({});
  await waitForAcpSessionIdle(host, 'session-1');
  const next = await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'After cancel' }],
  });
  expect(next.messageId).not.toBe(messageId);
  expect(requireScriptedProcessAt(agent.processes)).toBe(process);
  expect(openings).toHaveLength(1);
});

it('rejects unknown Sessions and input that breaks the contract', async (): Promise<void> => {
  const { caller } = await startSessionJourney();
  await expect(
    caller.session.prompt({
      sessionId: 'missing',
      prompt: [{ type: 'text', text: 'Hello' }],
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(
    caller.session.prompt({ sessionId: 'session-1', prompt: [] }),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it('reads a stored Session snapshot without connecting an Agent when its Feed is subscribed', async (): Promise<void> => {
  const { agent, createCaller } = await startSessionJourney();
  expect(agent.processes).toHaveLength(0);
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const caller = createCaller({ signal: controller.signal });
  const updates = await caller.feed.subscribe({
    sessionId: 'session-1',
    after: null,
  });
  const iterator = updates[Symbol.asyncIterator]();
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [] },
  });
  expect(agent.processes).toHaveLength(0);
  controller.abort();
  await iterator.return?.();
});

it('refuses commands for a Subagent while keeping its stored Feed readable', async (): Promise<void> => {
  const { caller, agent, database } = await startSessionJourney();
  insertSession(database, { id: 'subagent', parentSessionId: 'session-1' });
  await expect(
    caller.session.prompt({
      sessionId: 'subagent',
      prompt: [{ type: 'text', text: 'Start' }],
    }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: 'A Subagent is read-only',
  });
  expect(
    await caller.feed.page({ sessionId: 'subagent', direction: 'tail' }),
  ).toMatchObject({ rows: [] });
  expect(agent.processes).toHaveLength(0);
});
