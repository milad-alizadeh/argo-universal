import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

it('one lifetime receives successive Turns and idle text without inventing human provenance', async () => {
  const requests: PromptRequest[] = [];
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': ['1', '2'].map((number) => ({
        requests,
        steps: [
          {
            type: 'update' as const,
            update: {
              sessionUpdate: 'agent_message_chunk' as const,
              messageId: `reply-${number}`,
              content: { type: 'text' as const, text: `Reply ${number}` },
            },
          },
        ],
      })),
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  for (const text of ['First', 'Second']) {
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
  }
  const process = host.agent.processes[0];
  if (!process) throw new Error('ACP peer is missing');
  const events = (
    await host.caller.feed.subscribe({ ...created, after: null })
  )[Symbol.asyncIterator]();
  await events.next();
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'Idle output' },
        },
      },
    ],
    'owned-1',
  );
  let idleRowId: string | undefined;
  for await (const event of {
    [Symbol.asyncIterator]: (): typeof events => events,
  })
    if (event.type === 'row.upsert' && event.row.turnId === null) {
      idleRowId = event.row.id;
      break;
    }
  if (!idleRowId) throw new Error('Idle output is missing');
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(
    page.rows.map((row) => ({
      kind: row.sessionUpdate,
      turn: row.turnId,
      content: 'content' in row ? row.content : undefined,
    })),
  ).toMatchObject([
    {
      kind: 'user_message',
      turn: expect.any(String),
      content: [{ text: 'First' }],
    },
    {
      kind: 'agent_message',
      turn: expect.any(String),
      content: [{ text: 'Reply 1' }],
    },
    {
      kind: 'user_message',
      turn: expect.any(String),
      content: [{ text: 'Second' }],
    },
    {
      kind: 'agent_message',
      turn: expect.any(String),
      content: [{ text: 'Reply 2' }],
    },
  ]);
  expect(
    await host.caller.feed.row({ ...created, id: idleRowId }),
  ).toMatchObject({
    turnId: null,
    content: [{ text: 'Idle output' }],
  });
  expect(
    host.database.$client.prepare('SELECT COUNT(*) AS count FROM turn').get(),
  ).toEqual({ count: 2 });
  expect(page.rows[1]?.turnId).not.toBe(page.rows[3]?.turnId);
  expect(requests.map((request) => request.sessionId)).toEqual([
    'owned-1',
    'owned-1',
  ]);
  expect(host.agent.processes).toHaveLength(1);
});

it('closing a running Turn retains its association until final accepted text is published', async () => {
  const received = Promise.withResolvers<PromptRequest>();
  const host = await startAcpEngine({
    steps: [{ type: 'hold' }],
    responses: {
      'session/prompt': [{ received, steps: [{ type: 'hold' }] }],
      'session/close': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'Final accepted text' },
              },
            },
          ],
          result: {},
        },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Start' }],
  });
  await received.promise;
  await host.caller.session.close(created);
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(page.rows).toMatchObject([
    { sessionUpdate: 'user_message', turnId: expect.any(String) },
    {
      sessionUpdate: 'agent_message',
      state: 'settled',
      turnId: expect.any(String),
      content: [{ text: 'Final accepted text' }],
    },
  ]);
  expect(page.rows[1]?.turnId).toBe(page.rows[0]?.turnId);
  expect(
    host.database.$client.prepare('SELECT status, stop_reason FROM turn').get(),
  ).toEqual({ status: 'ended', stop_reason: 'cancelled' });
});

it('failed close keeps the Turn until observed process release, then publishes its accepted text', async () => {
  const received = Promise.withResolvers<PromptRequest>();
  const host = await startAcpEngine({
    autoExit: false,
    steps: [{ type: 'hold' }],
    responses: {
      'session/prompt': [{ received, steps: [{ type: 'hold' }] }],
      'session/close': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'Accepted before failed close' },
              },
            },
          ],
          error: 'Close refused',
        },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Start' }],
  });
  await received.promise;
  await expect(host.caller.session.close(created)).rejects.toThrow(
    'Internal error',
  );
  const process = host.agent.processes[0];
  if (!process) throw new Error('Owned lifetime is missing');
  expect(
    host.database.$client.prepare('SELECT status FROM turn').get(),
  ).toEqual({ status: 'running' });
  process.exited.resolve();
  await expect
    .poll(() => host.database.$client.prepare('SELECT status FROM turn').get())
    .toEqual({ status: 'ended' });
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(page.rows[1]).toMatchObject({
    state: 'settled',
    content: [{ text: 'Accepted before failed close' }],
    turnId: page.rows[0]?.turnId,
  });
  expect(
    host.database.$client.prepare('SELECT status, stop_reason FROM turn').get(),
  ).toEqual({ status: 'ended', stop_reason: 'cancelled' });
});
