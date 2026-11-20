import { SessionFeedOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { operationCaller, runOperation } from '#mocks/operations';

const markPattern = /\[(STATUS|COMPLETE|ANALYSIS)\]/;

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

// What another Agent reads of the Session's Agent messages.
async function agentMessages(
  host: Host,
  sessionId: string,
): Promise<SessionFeedOutput> {
  const caller = await operationCaller(host);

  return SessionFeedOutput.parse(
    await runOperation(caller.operations, {
      id: 'session.feed',
      params: { sessionId, limit: 10 },
    }),
  );
}

const listedActivity = async (
  host: Host,
  sessionId: string,
): Promise<string | undefined> =>
  (await host.caller.session.list({ archived: false })).sessions.find(
    (session) => session.sessionId === sessionId,
  )?.activity;

// A Session whose Agent has begun a marked message and holds its Turn open until `finish`.
async function arriving(finish: Promise<void>): Promise<{
  host: Host;
  sessionId: string;
}> {
  const entered = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          messageId: 'open',
          content: { type: 'text', text: '[STATUS] Looking' },
        },
      },
      { type: 'gate', waitFor: finish, entered },
    ],
  });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Look around' }],
  });

  await entered.promise;

  return { host, sessionId };
}

it('strips Voice marks from a message still arriving, before the Feed stores it', async () => {
  const finish = Promise.withResolvers<void>();

  try {
    const { host, sessionId } = await arriving(finish.promise);

    await expect
      .poll(async () => JSON.stringify(await agentMessages(host, sessionId)))
      .toContain('Looking');
    const { messages } = await agentMessages(host, sessionId);
    expect(JSON.stringify(messages)).not.toMatch(markPattern);

    const row = await host.caller.feed.row({
      sessionId,
      id: messages[0]?.id ?? '',
    });

    expect(JSON.stringify(row)).toContain('Looking');
    expect(JSON.stringify(row)).not.toMatch(markPattern);
    expect(await listedActivity(host, sessionId)).not.toMatch(markPattern);
  } finally {
    finish.resolve();
  }
});
