import { afterEach, describe, expect, it } from 'vitest';
import {
  voiceMoreWords,
  voiceTurnDone,
  voiceTurnGrows,
  voiceTurnOpens,
  voiceWords,
} from '#mocks/gpt-live-frames';
import { heard, startedCall, type GptLiveFixture } from '#mocks/gpt-live-setup';

/*
 * Diagnosis (voice/feed-diagnosis): what becomes of the voice's words on GPT-Live, which the App draws as a row.
 */

let fixture: GptLiveFixture | undefined;

afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});

const ids = (events: ReturnType<typeof heard>, final: boolean): string[] =>
  events.flatMap((event) =>
    event.type === 'voice.transcript' && event.final === final ? [event.id] : [],
  );

describe('GPT-Live voice words and their Feed row', () => {
  it('reports a partial under the id its final is stored under, so the App draws one row', async () => {
    fixture = await startedCall();
    const events = heard(fixture.call);

    for (const frame of [voiceWords, voiceMoreWords, voiceTurnOpens, voiceTurnGrows, voiceTurnDone])
      fixture.endpoint.send(frame);
    await expect.poll(() => ids(events, true)).toHaveLength(1);

    expect(new Set(ids(events, false))).toEqual(new Set(ids(events, true)));
  });

  it('keeps what the voice said so far when the person hangs up mid-sentence', async () => {
    fixture = await startedCall();
    const events = heard(fixture.call);

    for (const frame of [voiceWords, voiceTurnOpens, voiceTurnGrows])
      fixture.endpoint.send(frame);
    await expect.poll(() => ids(events, false).length).toBeGreaterThan(0);
    fixture.call.end();

    await expect.poll(() => ids(events, true), { timeout: 1000 }).toHaveLength(1);
  });
});
