import { expect, it, vi } from 'vitest';
import { waitFor } from 'xstate';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { sendAcpFeedUpdates, waitForAcpSessionIdle } from '#mocks/acp-feed';
import { findDatabaseWriter } from './index';

it('partial ACP tools read queued settled revisions without changing retained writes, then retry commits the newest row', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const sent = Promise.withResolvers<void>();
  const completion = Promise.withResolvers<{ stopReason: 'end_turn' }>();
  const host = await startAcpEngine({
    prompt: async (request) => {
      host.context.database.$client.exec(
        "CREATE TRIGGER hold_acp_feed BEFORE INSERT ON feed_row WHEN NEW.session_update = 'tool_call_update' BEGIN SELECT RAISE(FAIL, 'storage pressure'); END",
      );
      await sendAcpFeedUpdates(request, [
        {
          sessionUpdate: 'tool_call',
          toolCallId: 'queued',
          title: 'Read original',
          status: 'completed',
          rawInput: { path: '/original' },
          content: [
            { type: 'content', content: { type: 'text', text: 'Original' } },
          ],
        },
        {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'queued',
          rawOutput: { ok: true },
        },
      ]);
      sent.resolve();
      return completion.promise;
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Read' }],
  });
  try {
    await sent.promise;
    const writer = findDatabaseWriter(host.engine.system);
    if (!writer) throw new Error('Writer is missing');
    await waitFor(writer, (snapshot) => snapshot.matches('waitingToRetry'));
    const queuedRows = writer
      .getSnapshot()
      .context.queue.flatMap((job) =>
        job.type === 'feedRows' ? job.rows : [],
      );
    expect(
      queuedRows.filter((row) => row.sessionUpdate === 'tool_call_update'),
    ).toMatchObject([
      {
        revision: 2,
        rawInput: { path: '/original' },
        content: [{ content: { text: 'Original' } }],
      },
      {
        revision: 3,
        rawInput: { path: '/original' },
        rawOutput: { ok: true },
        content: [{ content: { text: 'Original' } }],
      },
    ]);
    const queuedTool = queuedRows.findLast(
      (row) => row.sessionUpdate === 'tool_call_update',
    );
    if (!queuedTool) throw new Error('Queued tool is missing');
    expect(
      await host.caller.feed.row({ ...created, id: queuedTool.id }),
    ).toMatchObject({
      revision: 3,
      title: 'Read original',
      rawInput: { path: '/original' },
      rawOutput: { ok: true },
      position: 1,
    });
    host.context.database.$client.exec('DROP TRIGGER hold_acp_feed');
    await waitFor(writer, (snapshot) => snapshot.matches('idle'));
    completion.resolve({ stopReason: 'end_turn' });
    await waitForAcpSessionIdle(host, created.sessionId);
  } finally {
    host.context.database.$client.exec('DROP TRIGGER IF EXISTS hold_acp_feed');
    completion.resolve({ stopReason: 'end_turn' });
  }
  expect(
    host.context.database.$client
      .prepare(
        "SELECT payload_version, revision, payload FROM feed_row WHERE session_id = ? AND session_update = 'tool_call_update'",
      )
      .get(created.sessionId),
  ).toMatchObject({
    payload_version: 1,
    revision: 3,
    payload: expect.stringContaining('"rawOutput":{"ok":true}'),
  });
});
