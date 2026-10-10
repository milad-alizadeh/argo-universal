import type { SessionUpdate } from '@repo/contracts';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

it('partial ACP tools remain readable during storage failure and retry commits the newest complete row', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const completion = Promise.withResolvers<void>();
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          steps: feedScenario([
            {
              sessionUpdate: 'tool_call',
              toolCallId: 'queued',
              title: 'Read original',
              status: 'completed',
              rawInput: { path: '/original' },
              content: [
                {
                  type: 'content',
                  content: { type: 'text', text: 'Original' },
                },
              ],
            },
            {
              sessionUpdate: 'tool_call_update',
              toolCallId: 'queued',
              rawOutput: { ok: true },
            },
          ]).steps,
          waitFor: completion.promise,
        },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const events = (
    await host.caller.feed.subscribe({ ...created, after: null })
  )[Symbol.asyncIterator]();
  await events.next();
  host.database.$client.exec(
    "CREATE TRIGGER hold_acp_feed BEFORE INSERT ON feed_row WHEN NEW.session_update = 'tool_call_update' BEGIN SELECT RAISE(FAIL, 'storage pressure'); END",
  );
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Read' }],
  });
  try {
    let tool: SessionUpdate | undefined;
    for await (const event of {
      [Symbol.asyncIterator]: (): typeof events => events,
    })
      if (event.type === 'row.upsert' && event.row.revision === 3) {
        tool = event.row;
        break;
      }
    expect(tool).toMatchObject({
      revision: 3,
      title: 'Read original',
      rawInput: { path: '/original' },
      rawOutput: { ok: true },
      content: [{ content: { text: 'Original' } }],
      position: 1,
    });
    if (!tool) throw new Error('Queued tool is missing');
    expect(await host.caller.feed.row({ ...created, id: tool.id })).toEqual(
      tool,
    );
    host.database.$client.exec('DROP TRIGGER hold_acp_feed');
    await expect
      .poll(
        () =>
          host.database.$client
            .prepare(
              "SELECT revision FROM feed_row WHERE session_id = ? AND session_update = 'tool_call_update'",
            )
            .get(created.sessionId),
        { timeout: 10000 },
      )
      .toEqual({ revision: 3 });
    completion.resolve();
    await waitForAcpSessionIdle(host, created.sessionId);
  } finally {
    host.database.$client.exec('DROP TRIGGER IF EXISTS hold_acp_feed');
    completion.resolve();
  }
  expect(
    host.database.$client
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
