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
  it('initial prompted creation rejects a failed prompt commit and later retry never dispatches', async () => {
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        responses: { 'session/prompt': [{ requests }] },
      },
      undefined,
      agentId,
    );

    host.database.$client.exec(rejectFeedInsertion);
    await expect(
      host.caller.session.new({
        ...sessionInput,
        prompt: [{ type: 'text', text: 'Never start' }],
      }),
    ).rejects.toThrow(commitFailureMessage);
    await restoreFeedWritesAndAwaitCommit(host);
    expect(requests).toEqual([]);
    expect(
      host.database.$client
        .prepare('SELECT status, stop_reason FROM turn')
        .get(),
    ).toEqual({ status: 'ended', stop_reason: 'error' });
  });
  it('a Turn insert failure rejects the later prompt receipt without ACP work', async () => {
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
    host.database.$client.exec(
      "CREATE TRIGGER reject_turn BEFORE INSERT ON turn BEGIN SELECT RAISE(FAIL, 'Turn unavailable'); END",
    );
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Never start' }],
      }),
    ).rejects.toThrow(commitFailureMessage);
    host.database.$client.exec('DROP TRIGGER reject_turn');
    await expect
      .poll(
        () => host.database.$client.prepare('SELECT status FROM turn').get(),
        { timeout: 10000 },
      )
      .toEqual({ status: 'ended' });
    expect(requests).toEqual([]);
  });
  it('a second submission cannot overtake an admitted running Turn', async () => {
    const completion = Promise.withResolvers<void>();
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        responses: {
          'session/prompt': [
            {
              requests,
              waitFor: completion.promise,
              result: { stopReason: 'end_turn' },
            },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'First' }],
    });
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Second' }],
      }),
    ).rejects.toThrow('cannot accept');
    completion.resolve();
    expect(requests).toHaveLength(1);
  });
});
