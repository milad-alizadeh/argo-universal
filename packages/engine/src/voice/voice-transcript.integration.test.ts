import { describe, expect, it } from 'vitest';
import {
  partialsOf,
  say,
  startedCall,
  startVoiceEngine,
  storedRows,
  transcriptsOf,
} from '#mocks/voice-engine';

const words = (text: string): unknown => [{ type: 'text', text }];

const person = 'person_transcript';
const voiceKind = 'voice_transcript';

describe('Voice call transcript', () => {
  it('stores what the person and the voice said as two kinds of Feed row, in the order spoken', async () => {
    const voice = await startVoiceEngine();
    const sessionId = await startedCall(voice);
    say(voice, 'person', 'p1', 'Is it done?', true);
    say(voice, 'voice', 'v1', 'Not yet.', true);
    say(voice, 'person', 'p2', 'Thanks', true);

    await expect
      .poll(() => transcriptsOf(voice.host, sessionId))
      .toEqual([
        { kind: person, text: words('Is it done?') },
        { kind: voiceKind, text: words('Not yet.') },
        { kind: person, text: words('Thanks') },
      ]);
  });

  it('places the transcript after the Agent’s Turn rows that came before it', async () => {
    const voice = await startVoiceEngine();
    const sessionId = await startedCall(voice);
    say(voice, 'person', 'p1', 'Hello again', true);
    await expect
      .poll(async () => (await storedRows(voice.host, sessionId)).at(-1))
      .toMatchObject({ sessionUpdate: person });

    const kinds = (await storedRows(voice.host, sessionId)).map(
      (row) => row.sessionUpdate,
    );
    expect(kinds.slice(0, -1)).toContain('user_message');
  });

  it('keeps words that are not final as live state of the call, not as rows', async () => {
    const voice = await startVoiceEngine();
    const sessionId = await startedCall(voice);
    say(voice, 'person', 'p1', 'Is it', false);
    await expect
      .poll(() => partialsOf(voice.host))
      .toEqual([{ speaker: 'person', id: 'p1', text: 'Is it' }]);
    expect(await transcriptsOf(voice.host, sessionId)).toEqual([]);

    say(voice, 'person', 'p1', 'Is it done?', false);
    await expect
      .poll(() => partialsOf(voice.host))
      .toEqual([{ speaker: 'person', id: 'p1', text: 'Is it done?' }]);

    say(voice, 'person', 'p1', 'Is it done?', true);
    await expect.poll(() => partialsOf(voice.host)).toEqual([]);
    await expect
      .poll(() => transcriptsOf(voice.host, sessionId))
      .toEqual([{ kind: person, text: words('Is it done?') }]);
  });

  it('holds one partial per speaker', async () => {
    const voice = await startVoiceEngine();
    await startedCall(voice);
    say(voice, 'person', 'p1', 'Wait', false);
    say(voice, 'voice', 'v1', 'Sure, I', false);
    await expect
      .poll(() => partialsOf(voice.host))
      .toEqual([
        { speaker: 'person', id: 'p1', text: 'Wait' },
        { speaker: 'voice', id: 'v1', text: 'Sure, I' },
      ]);
  });

  it('keeps the transcript after the call ends, and drops a partial that never became final', async () => {
    const voice = await startVoiceEngine();
    const sessionId = await startedCall(voice);
    say(voice, 'person', 'p1', 'Keep this', true);
    say(voice, 'voice', 'v1', 'Half a sen', false);
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
