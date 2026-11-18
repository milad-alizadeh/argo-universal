import type { FeedSubscribeOutput } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { promptText, startVoiceWork } from '#mocks/voice-work';
import { relayWords } from './relay-words';

const job = 'Run the tests';

const readme = 'Add a README';

const markPattern = /\[(STATUS|COMPLETE|ANALYSIS)\]/;

const marked = ['[STATUS] Running the suite', '[COMPLETE] All green'];

const agentTexts = (rows: { sessionUpdate: string }[]): string[] =>
  rows.flatMap((row) =>
    row.sessionUpdate === 'agent_message' && 'content' in row
      ? JSON.stringify(row.content)
      : [],
  );

// What a subscriber is sent for the Session's Agent messages, as one text.
const messagesIn = (events: FeedSubscribeOutput[]): string =>
  JSON.stringify(
    events.filter((event) => !JSON.stringify(event).includes('prompt_message')),
  );

describe('voice markers in the Feed', () => {
  it('are stripped when the Feed is read for drawing, and stored text is unchanged', async () => {
    const work = await startVoiceWork([{ prompt: job, messages: marked }]);
    await work.start();
    work.provider.call.requestWork('r1', job);
    await expect.poll(work.turnEnds).toHaveLength(2);

    const shown = agentTexts(await work.feed()).join('\n');
    expect(shown).toContain('Running the suite');
    expect(shown).not.toMatch(markPattern);
    expect(work.storedMessages()).toContain('[COMPLETE] All green');
  });

  it('are stripped from a row read on its own', async () => {
    const work = await startVoiceWork([{ prompt: job, messages: marked }]);
    await work.start();
    work.provider.call.requestWork('r1', job);
    await expect.poll(work.turnEnds).toHaveLength(2);

    const message = (await work.feed()).find(
      (row) => row.sessionUpdate === 'agent_message',
    );

    const row = await work.host.caller.feed.row({
      sessionId: work.sessionId,
      id: message?.id ?? '',
    });

    expect(JSON.stringify(row)).not.toContain('[STATUS]');
  });

  it('are stripped from what a subscriber is sent, live and in catch-up', async () => {
    const work = await startVoiceWork([{ prompt: job, messages: marked }]);
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
});

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
