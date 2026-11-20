import { describe, expect, it } from 'vitest';
import { promptText, startVoiceWork } from '#mocks/conversation-work';
import { relayWords } from './relay-words';

const readme = 'Add a README';

describe('a Prompt typed during a call', () => {
  it('goes to the Session as normal, and the voice is told what was sent and what came back', async () => {
    const work = await startVoiceWork([
      { prompt: readme, messages: ['[COMPLETE] Added it'] },
    ]);

    await work.start();
    await work.host.caller.session.prompt({
      sessionId: work.sessionId,
      prompt: [{ type: 'text', text: readme }],
    });

    await expect.poll(work.turnEnds).toHaveLength(2);
    expect(promptText(work.prompts[1])).toBe(readme);
    expect(work.provider.call.sent).toContainEqual({
      kind: 'tell',
      text: relayWords.typed(readme),
      delivery: 'background',
    });
    expect(work.provider.call.sent).toContainEqual({
      kind: 'tell',
      text: 'Added it',
      delivery: 'speak',
    });
  });
});
