import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { FeedSubscribeOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { uploadBlob, blobsFolderIn } from '../blob';

it('prompted creation uses the owned ACP Session and returns local acknowledgement before completion', async () => {
  const completion = Promise.withResolvers<void>();
  const received = Promise.withResolvers<PromptRequest>();
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          received,
          waitFor: completion.promise,
          result: { stopReason: 'end_turn' },
        },
      ],
    },
  });
  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Create and prompt' }],
  });
  const request = await received.promise;
  completion.resolve();
  expect(request).toEqual({
    sessionId: 'owned-1',
    prompt: [{ type: 'text', text: 'Create and prompt' }],
  });
  expect(
    host.database.$client
      .prepare('SELECT status FROM turn WHERE session_id = ?')
      .get(created.sessionId),
  ).toEqual({ status: 'running' });
});

it('a negotiated image prompt delivers every byte from the stored Blob', async () => {
  const received = Promise.withResolvers<PromptRequest>();
  const host = await startAcpEngine({
    initialize: {
      protocolVersion: 1,
      agentCapabilities: {
        promptCapabilities: { image: true },
        sessionCapabilities: { close: {} },
      },
    },
    steps: [],
    responses: { 'session/prompt': [{ received }] },
  });
  const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 255]);
  const image = await uploadBlob(
    {
      databaseWriter: host.databaseWriter,
      blobsFolder: blobsFolderIn(host.home),
    },
    new Blob([bytes], { type: 'image/png' }),
  );
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'image', mimeType: image.mime, blob: image }],
  });
  expect(await received.promise).toEqual({
    sessionId: 'owned-1',
    prompt: [{ type: 'image', mimeType: 'image/png', data: 'iVBORwECA/8=' }],
  });
  expect(
    host.database.$client
      .prepare('SELECT blob_id, session_id FROM blob_ref WHERE session_id = ?')
      .all(created.sessionId),
  ).toEqual([{ blob_id: image.blobId, session_id: created.sessionId }]);
});

it('local acknowledgement follows durable Session, Turn and prompt before the Agent finishes', async () => {
  const completion = Promise.withResolvers<void>();
  const received = Promise.withResolvers<PromptRequest>();
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [{ received, waitFor: completion.promise }],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const acknowledged = await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Save this prompt' }],
  });
  const observed = {
    request: await received.promise,
    durable: [
      host.database.$client
        .prepare('SELECT vendor_session_id FROM session WHERE id = ?')
        .get(created.sessionId),
      host.database.$client
        .prepare('SELECT status FROM turn WHERE session_id = ?')
        .get(created.sessionId),
      host.database.$client
        .prepare('SELECT session_update FROM feed_row WHERE session_id = ?')
        .get(created.sessionId),
    ],
  };
  completion.resolve();
  expect(acknowledged.messageId).toMatch(/:user$/);
  expect(observed).toEqual({
    request: {
      sessionId: 'owned-1',
      prompt: [{ type: 'text', text: 'Save this prompt' }],
    },
    durable: [
      { vendor_session_id: 'owned-1' },
      { status: 'running' },
      { session_update: 'user_message' },
    ],
  });
});

it('wire-earlier chunks are visible before completion publishes idle', async () => {
  const host = await startAcpEngine({
    steps: [
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'First ' },
        },
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'reply.' },
        },
      },
    ],
  });
  const created = await host.caller.session.new(emptySessionInput);
  const feed = (await host.caller.feed.subscribe({ ...created, after: null }))[
    Symbol.asyncIterator
  ]();
  await feed.next();
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Reply' }],
  });
  const updates: FeedSubscribeOutput[] = [];
  while (true) {
    const next = await feed.next();
    if (next.done) throw new Error('Session closed before completion');
    updates.push(next.value);
    if (
      next.value.type === 'snapshot' &&
      next.value.snapshot.activeTurnId === null
    )
      break;
  }
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(
    page.rows.filter((row) => row.sessionUpdate === 'agent_message'),
  ).toMatchObject([
    { state: 'settled', content: [{ type: 'text', text: 'First reply.' }] },
  ]);
  expect(
    updates
      .slice(0, -1)
      .some(
        (update) =>
          update.type === 'row.upsert' &&
          update.row.sessionUpdate === 'agent_message',
      ),
  ).toBe(true);
  await feed.return?.();
});
