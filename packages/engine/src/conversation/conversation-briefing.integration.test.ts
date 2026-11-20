import { describe, expect, it } from 'vitest';
import { startConversationWork } from '#mocks/conversation-work';

const briefingOf = async (messages: readonly string[]): Promise<string> => {
  const work = await startConversationWork([{ prompt: 'Hello', messages }]);
  await work.start();

  return work.provider.call.request.briefing;
};

describe('the briefing a new call starts with', () => {
  it('holds the Session title, working folder and recent Feed, without voice marks', async () => {
    const briefing = await briefingOf(['[COMPLETE] Hi there, I can help']);

    expect(briefing).toContain('Session: Hello');
    expect(briefing).toContain('Working folder: /');
    expect(briefing).toContain('Hi there, I can help');
    expect(briefing).not.toContain('[COMPLETE]');
  });

  it('stops at about 5,000 tokens, keeping the newest of the Feed', async () => {
    const messages = Array.from(
      { length: 30 },
      (_, index) => `Entry ${index}: ${'filler words '.repeat(170)}`,
    );

    const briefing = await briefingOf(messages);

    expect(briefing.length).toBeLessThanOrEqual(21_000);
    expect(briefing).toContain('Entry 29:');
    expect(briefing).not.toContain('Entry 0:');
  });
});

describe('the briefing of a call after an earlier one', () => {
  const fixBuild = 'Fix the build';

  const secondBriefing = async (): Promise<string> => {
    const work = await startConversationWork([
      { prompt: fixBuild, messages: ['[COMPLETE] Fixed it'] },
    ]);

    await work.start();
    work.provider.call.personSays('Can you fix the build?');
    work.provider.call.voiceSays('On it.');
    work.provider.call.requestWork('r1', fixBuild);
    await expect.poll(work.turnEnds).toHaveLength(2);
    await work.host.caller.conversation.end({ sessionId: work.sessionId });
    await work.start();

    return work.provider.call.request.briefing;
  };

  it('holds what the person and the voice said on the earlier call', async () => {
    const briefing = await secondBriefing();

    expect(briefing).toContain('Person: Can you fix the build?');
    expect(briefing).toContain('Voice: On it.');
  });

  it('names a request the voice sent as the voice’s, without the instruction to the Agent', async () => {
    const briefing = await secondBriefing();

    expect(briefing).toContain(`Conversation request: ${fixBuild}`);
    expect(briefing).not.toContain(`Person: ${fixBuild}`);
    expect(briefing).not.toContain('Begin every message with one mark');
  });
});
