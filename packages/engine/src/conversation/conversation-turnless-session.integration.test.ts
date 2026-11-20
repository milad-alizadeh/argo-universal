import { describe, expect, it } from 'vitest';
import {
  promptText,
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';

const fixBuild = 'Fix the build';

const callStatus = async (
  work: ConversationWork,
): Promise<string | undefined> =>
  (await work.host.caller.conversation.status()).conversation?.status;

const rowKinds = async (work: ConversationWork): Promise<string[]> =>
  (await work.feed()).map((row) => row.sessionUpdate);

describe('a Conversation in a Session with no Turns yet', () => {
  it(
    'starts, and the first spoken request reaches the Agent and starts the first Turn',
    { timeout: 30000 },
    async () => {
      const work = await startConversationWork(
        [{ prompt: fixBuild, messages: ['[COMPLETE] Fixed it'] }],
        { turnless: true },
      );

      expect(await work.feed()).toEqual([]);
      await work.start();
      await expect.poll(() => callStatus(work)).toBe('connected');
      work.provider.call.requestWork('r1', fixBuild);

      await expect.poll(() => work.prompts.length).toBe(1);
      expect(promptText(work.prompts[0])).toContain(fixBuild);
      await expect.poll(work.turnEnds).toHaveLength(1);
      await expect
        .poll(work.promptRows)
        .toMatchObject([
          { _meta: { argo: { sender: { type: 'conversation' } } } },
        ]);
    },
  );

  it('stores what the person says in the Feed it had none of', async () => {
    const work = await startConversationWork([], { turnless: true });

    await work.start();
    work.provider.call.personSays('Hello there');

    await expect.poll(() => rowKinds(work)).toContain('person_transcript');
  });
});
