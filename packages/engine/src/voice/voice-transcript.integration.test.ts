import { describe, expect, it } from 'vitest';
import {
  partialsOf,
  said,
  say,
  startedCall,
  startVoiceEngine,
  storedRows,
  transcriptsOf,
} from '#mocks/voice-engine';

type Words = { type: 'text'; text: string }[];

const words = (text: string): Words => [{ type: 'text', text }];

const person = 'person_transcript';

const voiceKind = 'voice_transcript';

const isItDone = 'Is it done?';

const personId = 'p1';

const voiceId = 'v1';

describe('Voice call transcript', () => {
  it('stores what the person and the voice said as two kinds of Feed row, in the order spoken', async () => {
    const voice = await startVoiceEngine();
    const sessionId = await startedCall(voice);
    say(voice, said.person(personId, isItDone, true));
    say(voice, said.voice(voiceId, 'Not yet.', true));
    say(voice, said.person('p2', 'Thanks', true));

    await expect
      .poll(() => transcriptsOf(voice.host, sessionId))
      .toEqual([
        { kind: person, text: words(isItDone) },
        { kind: voiceKind, text: words('Not yet.') },
        { kind: person, text: words('Thanks') },
      ]);
  });

  it('places the transcript after the Agent’s Turn rows that came before it', async () => {
    const voice = await startVoiceEngine();
    const sessionId = await startedCall(voice);
    say(voice, said.person(personId, 'Hello again', true));
    await expect
      .poll(async () => (await storedRows(voice.host, sessionId)).at(-1))
      .toMatchObject({ sessionUpdate: person });

    const rows = await storedRows(voice.host, sessionId);
    const kinds = rows.map((row) => row.sessionUpdate);
    expect(kinds.slice(0, -1)).toContain('user_message');
  });

  it('keeps words that are not final as live state of the call, not as rows', async () => {
    const voice = await startVoiceEngine();
    const sessionId = await startedCall(voice);
    say(voice, said.person(personId, 'Is it', false));
    await expect
      .poll(() => partialsOf(voice.host))
      .toEqual([{ speaker: 'person', id: personId, text: 'Is it' }]);
    expect(await transcriptsOf(voice.host, sessionId)).toEqual([]);

    say(voice, said.person(personId, isItDone, false));
    await expect
      .poll(() => partialsOf(voice.host))
      .toEqual([{ speaker: 'person', id: personId, text: isItDone }]);

    say(voice, said.person(personId, isItDone, true));
    await expect.poll(() => partialsOf(voice.host)).toEqual([]);
    await expect
      .poll(() => transcriptsOf(voice.host, sessionId))
      .toEqual([{ kind: person, text: words(isItDone) }]);
  });

  it('holds one partial per speaker', async () => {
    const voice = await startVoiceEngine();
    await startedCall(voice);
    say(voice, said.person(personId, 'Wait', false));
    say(voice, said.voice(voiceId, 'Sure, I', false));
    await expect
      .poll(() => partialsOf(voice.host))
      .toEqual([
        { speaker: 'person', id: personId, text: 'Wait' },
        { speaker: 'voice', id: voiceId, text: 'Sure, I' },
      ]);
  });

  it('keeps the transcript after the call ends, and drops a partial that never became final', async () => {
    const voice = await startVoiceEngine();
    const sessionId = await startedCall(voice);
    say(voice, said.person(personId, 'Keep this', true));
    say(voice, said.voice(voiceId, 'Half a sen', false));
    await expect
      .poll(() => transcriptsOf(voice.host, sessionId))
      .toHaveLength(1);
    await voice.host.caller.voice.end({ sessionId });

    expect(await transcriptsOf(voice.host, sessionId)).toEqual([
      { kind: person, text: words('Keep this') },
    ]);
    expect(await partialsOf(voice.host)).toEqual([]);
  });
});
