import type { PromptRequest } from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const commitFailureMessage = 'could not be saved';

const rejectFeedInsertion =
  "CREATE TRIGGER reject_feed BEFORE INSERT ON feed_row BEGIN SELECT RAISE(FAIL, 'prompt storage unavailable'); END";

const restoreFeedWritesAndAwaitCommit = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
): Promise<void> => {
  host.database.$client.exec('DROP TRIGGER reject_feed');
  await expect
    .poll(
      () =>
        host.database.$client
          .prepare('SELECT COUNT(*) AS count FROM feed_row')
          .get(),
      { timeout: 10000 },
    )
    .toEqual({ count: 2 });
};

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it('unsupported image prompts reject before success or Agent work', async () => {
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        initialize: {
          protocolVersion: 1,
          agentCapabilities: {
            sessionCapabilities: { close: {}, resume: {} },
          },
        },
        responses: { 'session/prompt': [{ requests }] },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [
          {
            type: 'image',
            mimeType: 'image/png',
            blob: { blobId: 'missing', mime: 'image/png', bytes: 1 },
          },
        ],
      }),
    ).rejects.toThrow('does not support image');
    expect(requests).toEqual([]);
    expect(
      host.database.$client
        .prepare('SELECT COUNT(*) AS count FROM feed_row')
        .get(),
    ).toEqual({ count: 1 });
    expect(
      (await host.caller.feed.page({ ...created, direction: 'tail' })).rows,
    ).toMatchObject([
      {
        sessionUpdate: 'notice',
        _meta: { argo: { turnEnd: { stopReason: 'error' } } },
      },
    ]);
  });
});

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it('a new explicit submission succeeds after a rejected commit and does not inherit its closure failure', async () => {
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        responses: { 'session/prompt': [{ requests }] },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);
    host.database.$client.exec(rejectFeedInsertion);
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Failed' }],
      }),
    ).rejects.toThrow(commitFailureMessage);
    await restoreFeedWritesAndAwaitCommit(host);
    expect(requests).toEqual([]);
    expect(
      host.database.$client
        .prepare('SELECT status, stop_reason FROM turn WHERE session_id = ?')
        .get(created.sessionId),
    ).toEqual({ status: 'ended', stop_reason: 'error' });

    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Explicit retry' }],
    });
    await expect(host.caller.session.close(created)).resolves.toEqual({});
    expect(requests.map((request) => request.prompt)).toEqual([
      [{ type: 'text', text: 'Explicit retry' }],
    ]);
  });
});
