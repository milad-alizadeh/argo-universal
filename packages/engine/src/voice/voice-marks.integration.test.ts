import { describe, expect, it } from 'vitest';
import { operationCaller, runOperation } from '#mocks/operations';
import { startVoiceWork, type VoiceWork } from '#mocks/voice-work';

const job = 'Run the tests';

const markPattern = /\[(STATUS|COMPLETE|ANALYSIS)\]/;

// A call whose Agent marked both its messages, after its Turn has ended.
async function markedWork(): Promise<VoiceWork> {
  const work = await startVoiceWork([
    {
      prompt: job,
      messages: ['[STATUS] Running the suite', '[COMPLETE] All green'],
    },
  ]);

  await work.start();
  work.provider.call.requestWork('r1', job);
  await expect.poll(work.turnEnds).toHaveLength(2);

  return work;
}

const listedActivity = async (work: VoiceWork): Promise<string | undefined> =>
  (await work.host.caller.session.list({ archived: false })).sessions.find(
    (session) => session.sessionId === work.sessionId,
  )?.activity;

describe('Voice marks', () => {
  it('are not in the Session list preview of the last Agent message', async () => {
    const work = await markedWork();

    await expect.poll(() => listedActivity(work)).toContain('All green');
    expect(await listedActivity(work)).not.toMatch(markPattern);
  });

  it('are not in the Agent messages another Agent reads', async () => {
    const work = await markedWork();
    const caller = await operationCaller(work.host);

    const read = JSON.stringify(
      await runOperation(caller.operations, {
        id: 'session.feed',
        params: { sessionId: work.sessionId, limit: 10 },
      }),
    );

    expect(read).toContain('All green');
    expect(read).not.toMatch(markPattern);
  });
});
