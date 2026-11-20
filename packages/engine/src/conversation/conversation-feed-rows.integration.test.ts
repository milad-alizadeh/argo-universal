import { describe, expect, it } from 'vitest';
import {
  callAnswering,
  messageRows,
  rowsDrawn,
  untilHandedOver,
} from '#mocks/conversation-feed-rows';
import { startConversationWork } from '#mocks/conversation-work';

/*
 * The rows a Session's Feed holds during a Conversation (ADR-0064), replayed from the owner's recording with the fake
 * provider. The fake voice says what GPT-Live said; the mock Agent answers as Opus did.
 */

describe('Feed rows during a Conversation', () => {
  it("draws the Agent's answer once, not also the voice reading it out", async () => {
    const answer = 'Nothing was running and nothing was changed.';
    const work = await callAnswering('anything running', answer);
    const { call } = work.provider;

    call.personSays('Is anything running?', 'p1');
    await untilHandedOver(work, 'is anything running', answer);
    // GPT-Live reads the relayed result aloud in its own words: a read-out, not a row.
    call.voiceSays('Nothing was running.', 'v1');
    await rowsDrawn(work, 2);

    expect(await messageRows(work)).toEqual([
      'person_transcript: Is anything running?',
      `agent_message: ${answer}`,
    ]);
  });

  it("neither draws the Agent's silent [ANALYSIS] notes nor hands them to the voice", async () => {
    const analysis = 'The person may be stressed; keep the answer brief.';

    const work = await startConversationWork([
      {
        prompt: 'what day',
        messages: [
          '[STATUS] Checking the date.',
          `[ANALYSIS] ${analysis}\n[COMPLETE] It is Thursday.`,
        ],
      },
    ]);

    await work.start();
    work.provider.call.requestWork('r1', 'what day is it');
    await expect.poll(work.turnEnds).toHaveLength(2);

    expect(work.provider.call.sent.map(({ text }) => text)).not.toContain(
      analysis,
    );
    expect(await messageRows(work)).toEqual([
      'agent_message: Checking the date.',
      'agent_message: It is Thursday.',
    ]);
  });

  it('keeps chit-chat the voice answers itself as person and voice rows, with no Prompt or Agent row', async () => {
    const work = await startConversationWork([]);

    await work.start();
    const { call } = work.provider;

    call.personSays('Hey.', 'p1');
    call.voiceSays('Hey! How are you doing?', 'v1');
    call.personSays("I'm doing well. How you doing?", 'p2');
    call.voiceSays("I'm good, thanks.", 'v2');
    await rowsDrawn(work, 4);

    expect(await messageRows(work)).toEqual([
      'person_transcript: Hey.',
      'voice_transcript: Hey! How are you doing?',
      "person_transcript: I'm doing well. How you doing?",
      "voice_transcript: I'm good, thanks.",
    ]);
    expect(await work.promptRows()).toHaveLength(0);
  });

  it('keeps what the voice said so far when the person hangs up', async () => {
    const work = await startConversationWork([]);

    await work.start();
    const { call } = work.provider;

    call.personSays('Tell me a story.', 'p1');
    call.emit({
      type: 'voice.transcript',
      id: 'v1',
      text: 'Once upon',
      final: false,
    });
    call.wordsAtEnd.push({
      type: 'voice.transcript',
      id: 'v1',
      text: 'Once upon a time',
      final: true,
    });
    await work.host.caller.conversation.end({ sessionId: work.sessionId });
    await rowsDrawn(work, 2);

    expect(await messageRows(work)).toEqual([
      'person_transcript: Tell me a story.',
      'voice_transcript: Once upon a time',
    ]);
  });
});
