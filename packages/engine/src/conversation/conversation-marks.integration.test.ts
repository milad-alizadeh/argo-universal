import type { FeedSubscribeOutput } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { operationCaller, runOperation } from '#mocks/operations';
import { startVoiceWork, type VoiceWork } from '#mocks/conversation-work';

const job = 'Run the tests';

const allGreen = '[COMPLETE] All green';

const markPattern = /\[(STATUS|COMPLETE|ANALYSIS)\]/;

type Host = VoiceWork['host'];

// A call whose Agent marked both its messages, after its Turn has ended.
async function markedWork(): Promise<VoiceWork> {
  const work = await startVoiceWork([
    {
      prompt: job,
      messages: ['[STATUS] Running the suite', allGreen],
    },
  ]);

  await work.start();
  work.provider.call.requestWork('r1', job);
  await expect.poll(work.turnEnds).toHaveLength(2);

  return work;
}

// What another Agent reads of the Session's Agent messages, as one text.
async function agentMessages(host: Host, sessionId: string): Promise<string> {
  const caller = await operationCaller(host);

  return JSON.stringify(
    await runOperation(caller.operations, {
      id: 'session.feed',
      params: { sessionId, limit: 10 },
    }),
  );
}

const listedActivity = async (work: VoiceWork): Promise<string | undefined> =>
  (await work.host.caller.session.list({ archived: false })).sessions.find(
    (session) => session.sessionId === work.sessionId,
  )?.activity;

// The Agent messages among rows, as one text.
const agentTexts = (rows: { sessionUpdate: string }[]): string =>
  JSON.stringify(rows.filter((row) => row.sessionUpdate === 'agent_message'));

// What a subscriber is sent for the Session's Agent messages, as one text.
const messagesIn = (events: FeedSubscribeOutput[]): string =>
  JSON.stringify(
    events.filter((event) => !JSON.stringify(event).includes('prompt_message')),
  );

describe('Voice marks are stripped wherever an Agent message is read', () => {
  it('in a Feed page, while stored text keeps them', async () => {
    const work = await markedWork();

    const shown = agentTexts(await work.feed());
    expect(shown).toContain('Running the suite');
    expect(shown).not.toMatch(markPattern);
    expect(work.storedMessages()).toContain(allGreen);
  });

  it('in a row read on its own', async () => {
    const work = await markedWork();

    const message = (await work.feed()).find(
      (row) => row.sessionUpdate === 'agent_message',
    );

    const row = await work.host.caller.feed.row({
      sessionId: work.sessionId,
      id: message?.id ?? '',
    });

    expect(JSON.stringify(row)).toContain('Running the suite');
    expect(JSON.stringify(row)).not.toMatch(markPattern);
  });

  it('in what a subscriber is sent, live and in catch-up', async () => {
    const work = await startVoiceWork([
      { prompt: job, messages: ['[STATUS] Running', allGreen] },
    ]);

    await work.start();
    const collecting = work.subscription(1);
    work.provider.call.requestWork('r1', job);

    const live = messagesIn(await collecting);
    expect(live).toContain('All green');
    expect(live).not.toMatch(markPattern);

    const caughtUp = messagesIn(await work.subscription(2, true));
    expect(caughtUp).toContain('All green');
    expect(caughtUp).not.toMatch(markPattern);
  });

  it('in the Session list preview of the last Agent message', async () => {
    const work = await markedWork();

    await expect.poll(() => listedActivity(work)).toContain('All green');
    expect(await listedActivity(work)).not.toMatch(markPattern);
  });

  it('in the Agent messages another Agent reads', async () => {
    const work = await markedWork();
    const read = await agentMessages(work.host, work.sessionId);

    expect(read).toContain('All green');
    expect(read).not.toMatch(markPattern);
  });
});
