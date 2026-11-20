import { describe, expect, it } from 'vitest';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  heldPrompt,
  partialsOf,
  said,
  say,
  startCallInHeldSession,
  startedCall,
  startConversationEngine,
  storedRows,
  transcriptsOf,
} from '#mocks/conversation-engine';

const person = 'person_transcript';

const voiceKind = 'voice_transcript';

const isItDone = 'Is it done?';

const personId = 'p1';

const voiceId = 'v1';

// The ids of the stored rows of what the voice said.
const conversationRowIdsOf = async (
  host: Parameters<typeof storedRows>[0],
  sessionId: string,
): Promise<string[]> =>
  (await storedRows(host, sessionId))
    .filter((row) => row.sessionUpdate === voiceKind)
    .map((row) => row.id);

describe('Conversation transcript', () => {
  it('stores what the person and the voice said as two kinds of Feed row, in the order spoken', async () => {
    const voice = await startConversationEngine();
    const sessionId = await startedCall(voice);
    say(voice, said.person(personId, isItDone, true));
    say(voice, said.voice(voiceId, 'Not yet.', true));
    say(voice, said.person('p2', 'Thanks', true));

    await expect
      .poll(() => transcriptsOf(voice.host, sessionId))
      .toEqual([
        { kind: person, text: isItDone },
        { kind: voiceKind, text: 'Not yet.' },
        { kind: person, text: 'Thanks' },
      ]);
  });

  it(
    'interleaves the transcript with the Agent’s Turn rows as it was spoken',
    { timeout: 30000 },
    async () => {
      const { voice, sessionId } = await startCallInHeldSession();
      const { host } = voice;
      await host.caller.session.prompt({
        sessionId,
        prompt: [{ type: 'text', text: heldPrompt }],
      });
      await waitForAcpSnapshot(host, sessionId, (s) => s.state === 'running');
      say(voice, said.person(personId, 'During the Turn', true));
      await expect.poll(() => transcriptsOf(host, sessionId)).toHaveLength(1);
      await host.caller.session.cancel({ sessionId });
      await waitForAcpSessionIdle(host, sessionId);
      say(voice, said.voice(voiceId, 'After the Turn', true));
      await expect.poll(() => transcriptsOf(host, sessionId)).toHaveLength(2);

      const rows = await storedRows(host, sessionId);
      expect(rows.map((row) => row.sessionUpdate)).toEqual([
        'user_message',
        person,
        'notice',
        voiceKind,
      ]);
    },
  );

  it('keeps words that are not final as live state of the call, not as rows', async () => {
    const voice = await startConversationEngine();
    const sessionId = await startedCall(voice);
    say(voice, said.person(personId, 'Is it', false));
    await expect
      .poll(() => partialsOf(voice.host))
      .toMatchObject([{ speaker: 'person', id: personId, text: 'Is it' }]);
    expect(await transcriptsOf(voice.host, sessionId)).toEqual([]);

    say(voice, said.person(personId, isItDone, false));
    await expect
      .poll(() => partialsOf(voice.host))
      .toMatchObject([{ speaker: 'person', id: personId, text: isItDone }]);

    say(voice, said.person(personId, isItDone, true));
    await expect.poll(() => partialsOf(voice.host)).toEqual([]);
    await expect
      .poll(() => transcriptsOf(voice.host, sessionId))
      .toEqual([{ kind: person, text: isItDone }]);
  });

  it('names each partial by the row its final words are stored under, so the App draws them as one', async () => {
    const voice = await startConversationEngine();
    const sessionId = await startedCall(voice);
    say(voice, said.voice(voiceId, 'Not', false));
    await expect.poll(() => partialsOf(voice.host)).toHaveLength(1);
    const [partial] = await partialsOf(voice.host);

    say(voice, said.voice(voiceId, 'Not yet.', true));
    await expect
      .poll(() => conversationRowIdsOf(voice.host, sessionId))
      .toEqual([partial?.rowId]);
  });

  it('holds one partial per speaker', async () => {
    const voice = await startConversationEngine();
    await startedCall(voice);
    say(voice, said.person(personId, 'Wait', false));
    say(voice, said.voice(voiceId, 'Sure, I', false));
    await expect
      .poll(() => partialsOf(voice.host))
      .toMatchObject([
        { speaker: 'person', id: personId, text: 'Wait' },
        { speaker: 'voice', id: voiceId, text: 'Sure, I' },
      ]);
  });

  it('keeps the transcript after the call ends, and drops a partial that never became final', async () => {
    const voice = await startConversationEngine();
    const sessionId = await startedCall(voice);
    say(voice, said.person(personId, 'Keep this', true));
    say(voice, said.voice(voiceId, 'Half a sen', false));
    await expect
      .poll(() => transcriptsOf(voice.host, sessionId))
      .toHaveLength(1);
    await expect
      .poll(() => partialsOf(voice.host))
      .toMatchObject([{ speaker: 'voice', id: voiceId, text: 'Half a sen' }]);
    await voice.host.caller.conversation.end({ sessionId });

    expect(await transcriptsOf(voice.host, sessionId)).toEqual([
      { kind: person, text: 'Keep this' },
    ]);
    expect(await partialsOf(voice.host)).toEqual([]);
  });
});
