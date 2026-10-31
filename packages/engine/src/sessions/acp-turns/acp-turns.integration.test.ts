import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { FeedSubscribeOutput, SessionUpdate } from '@repo/contracts';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const isIdleRow = (
  event: FeedSubscribeOutput,
): event is Extract<FeedSubscribeOutput, { type: 'row.upsert' }> =>
  event.type === 'row.upsert' && event.row.turnId === null;

const requireRowId = (id: string): string => {
  if (!id) throw new Error('Idle output is missing');

  return id;
};

async function idleRowId(
  events: AsyncIterator<FeedSubscribeOutput>,
): Promise<string> {
  for await (const event of {
    [Symbol.asyncIterator]: (): typeof events => events,
  })
    if (isIdleRow(event)) return requireRowId(event.row.id);

  throw new Error('Idle output is missing');
}

const idleText = 'Idle output';

const turnIdOf = (row: SessionUpdate | undefined): string | null | undefined =>
  row?.turnId;

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  it('one lifetime receives successive Turns and idle text without inventing human provenance', async () => {
    const requests: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
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
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    for (const text of ['First', 'Second']) {
      await host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text }],
      });
      await waitForAcpSessionIdle(host, created.sessionId);
    }

    const process = requireScriptedProcessAt(host.agent.processes);

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
            content: { type: 'text', text: idleText },
          },
        },
      ],
      'owned-1',
    );
    const idleId = await idleRowId(events);
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
      { kind: 'notice', turn: expect.any(String) },
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
      { kind: 'notice', turn: expect.any(String) },
      { kind: 'agent_message', turn: null, content: [{ text: idleText }] },
    ]);
    expect(
      await host.caller.feed.row({ ...created, id: idleId }),
    ).toMatchObject({
      turnId: null,
      state: 'settled',
      content: [{ text: idleText }],
    });
    expect(
      host.database.$client.prepare('SELECT COUNT(*) AS count FROM turn').get(),
    ).toEqual({ count: 2 });
    expect(turnIdOf(page.rows[1])).not.toBe(turnIdOf(page.rows[4]));
    expect(requests.map((request) => request.sessionId)).toEqual([
      'owned-1',
      'owned-1',
    ]);
    expect(host.agent.processes).toHaveLength(1);
  });
});
