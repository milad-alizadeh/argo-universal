import type { SessionUpdate } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { startVoiceWork, type VoiceWork } from '#mocks/voice-work';

/*
 * Diagnosis (voice/feed-diagnosis): the rows a Session's Feed holds during a Voice call, replayed from the owner's
 * recording with the fake provider. The fake voice says what GPT-Live said; the mock Agent answers as Opus did.
 * Red tests assert what the person should see; see the diagnosis report for the root causes.
 */

const shown = ['person_transcript', 'voice_transcript', 'agent_message'];

const textOf = (row: SessionUpdate): string =>
  'content' in row && Array.isArray(row.content)
    ? row.content
        .map((block: { type: string; text?: string }) =>
          block.type === 'text' ? (block.text ?? '') : '',
        )
        .join('')
    : '';

// The rows the Feed draws as messages, after the Session's opening Turn: who said them and what.
async function messageRows(work: VoiceWork): Promise<string[]> {
  const rows = (await work.feed()).filter((row) =>
    shown.includes(row.sessionUpdate),
  );

  return rows
    .map((row) => `${row.sessionUpdate}: ${textOf(row)}`)
    .filter((row) => !row.startsWith('agent_message: Hello'));
}

const spoke = (work: VoiceWork, text: string): boolean =>
  work.provider.call.sent.some(
    (message) => message.kind === 'tell' && message.text === text,
  );

describe('Feed rows during a Voice call', () => {
  it('1. "No, let\'s stop": the Agent\'s answer is one row, not also the voice reading it out', async () => {
    const stopped = 'Okay, stopped. Nothing was running and nothing was changed.';
    const work = await startVoiceWork([
      { prompt: "No, let's stop", messages: [`[COMPLETE] ${stopped}`] },
    ]);
    await work.start();
    const { call } = work.provider;

    call.personSays("No, let's stop.", 'p1');
    // Not a bare "stop", so the voice hands it over as a Prompt.
    call.requestWork('r1', "No, let's stop");
    await expect.poll(work.turnEnds).toHaveLength(2);
    await expect.poll(() => spoke(work, stopped)).toBe(true);
    // GPT-Live reads the relayed result aloud in its own words; that is a voice turn like any other.
    call.voiceSays('Okay, pausing now. Nothing was running.', 'v1');
    await expect
      .poll(async () => (await messageRows(work)).length)
      .toBeGreaterThanOrEqual(2);

    expect(await messageRows(work)).toEqual([
      "person_transcript: No, let's stop.",
      `agent_message: ${stopped}`,
    ]);
  });

  it('2. the voice reading out the Agent\'s answer is not drawn as a live row below it', async () => {
    const answer =
      'Today is Thursday, 19 November 2026, day 323 of the year.\n\n## ADHD\n\n- Externalise time';
    const work = await startVoiceWork([
      { prompt: 'what day of the year', messages: [`[COMPLETE] ${answer}`] },
    ]);
    await work.start();
    const { call } = work.provider;

    call.personSays('What day of the year is it, and how can I manage my ADHD better?', 'p1');
    call.requestWork('r1', 'what day of the year is it, and ADHD tips');
    call.voiceSays("Sure, I'll take a look.", 'v-filler');
    await expect.poll(work.turnEnds).toHaveLength(2);
    await expect.poll(() => spoke(work, answer)).toBe(true);
    // The read-out, still being spoken: a partial the App draws at the Feed's tail.
    call.emit({
      type: 'voice.transcript',
      id: 'item-readout',
      text: 'It is Thursday, November 19th, day 323 of the year. For ADHD, a few things',
      final: false,
    });
    await expect
      .poll(async () => (await work.host.caller.voice.status()).partials.length)
      .toBeGreaterThan(0);

    const { partials } = await work.host.caller.voice.status();
    expect(partials).toEqual([]);
  });

  it('3. the Agent\'s silent [ANALYSIS] notes are neither drawn nor handed to the voice', async () => {
    const analysis = 'The person may be stressed; keep the answer brief.';
    const work = await startVoiceWork([
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

    expect.soft(work.provider.call.sent.map((m) => m.text)).not.toContain(analysis);
    expect.soft(await messageRows(work)).toEqual([
      'agent_message: Checking the date.',
      'agent_message: It is Thursday.',
    ]);
  });

  it('4. chit-chat the voice answers itself is person and voice rows only, with no Prompt or Agent row', async () => {
    const work = await startVoiceWork([]);
    await work.start();
    const { call } = work.provider;

    call.personSays('Hey.', 'p1');
    call.voiceSays('Hey! How are you doing?', 'v1');
    call.personSays("I'm doing well. How you doing?", 'p2');
    call.voiceSays("I'm good, thanks.", 'v2');
    await expect.poll(async () => (await messageRows(work)).length).toBe(4);

    expect(await messageRows(work)).toEqual([
      'person_transcript: Hey.',
      'voice_transcript: Hey! How are you doing?',
      "person_transcript: I'm doing well. How you doing?",
      "voice_transcript: I'm good, thanks.",
    ]);
    expect(await work.promptRows()).toHaveLength(0);
  });
});
