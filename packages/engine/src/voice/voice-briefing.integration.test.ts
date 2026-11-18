import { describe, expect, it } from 'vitest';
import { startVoiceWork } from '#mocks/voice-work';

const briefingOf = async (messages: readonly string[]): Promise<string> => {
  const work = await startVoiceWork([{ prompt: 'Hello', messages }]);
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
