import { describe, expect, it } from 'vitest';
import {
  callAnswering,
  messageRows,
  rowsDrawn,
  untilHandedOver,
} from '#mocks/conversation-feed-rows';

/*
 * The voice reading out an Agent's result (ADR-0064): from the hand-over until the person speaks again, what the voice
 * says is neither stored nor drawn, since the Agent's answer is already the record.
 */

const answer = 'It is Thursday.';

const request = 'what day is it';

describe('the voice reading out an Agent result', () => {
  it('is not drawn as a live row below the answer', async () => {
    const work = await callAnswering('what day', answer);
    const { call } = work.provider;

    call.voiceSays("Sure, I'll take a look.", 'v-filler');
    await untilHandedOver(work, request, answer);
    call.emit({
      type: 'voice.transcript',
      id: 'v-readout',
      text: 'It is Thursday, November 19th',
      final: false,
    });
    // The person starts to speak after it, so the read-out was heard before their words show.
    call.emit({
      type: 'person.transcript',
      id: 'p2',
      text: 'Thanks',
      final: false,
    });
    await expect
      .poll(async () => (await work.host.caller.conversation.status()).partials.length)
      .toBeGreaterThan(0);

    const { partials } = await work.host.caller.conversation.status();

    expect(partials.map(({ speaker }) => speaker)).toEqual(['person']);
  });

  it("ends when the person speaks again, so the voice's reply is a row", async () => {
    const work = await callAnswering('what day', answer);
    const { call } = work.provider;

    call.personSays('What day is it?', 'p1');
    await untilHandedOver(work, request, answer);
    call.voiceSays("It's Thursday.", 'v-readout');
    call.personSays('Thanks.', 'p2');
    call.voiceSays("You're welcome.", 'v2');
    await rowsDrawn(work, 4);

    expect(await messageRows(work)).toEqual([
      'person_transcript: What day is it?',
      `agent_message: ${answer}`,
      'person_transcript: Thanks.',
      "voice_transcript: You're welcome.",
    ]);
  });

  it('spares the voice turn already under way at the hand-over', async () => {
    const work = await callAnswering('what day', answer);
    const { call } = work.provider;

    call.emit({
      type: 'voice.transcript',
      id: 'v-filler',
      text: 'Sure,',
      final: false,
    });
    await untilHandedOver(work, request, answer);
    call.voiceSays("Sure, I'll take a look.", 'v-filler');
    await rowsDrawn(work, 2);

    expect(await messageRows(work)).toEqual([
      `agent_message: ${answer}`,
      "voice_transcript: Sure, I'll take a look.",
    ]);
  });
});
