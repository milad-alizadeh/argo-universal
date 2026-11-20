import { describe, expect, it } from 'vitest';
import {
  callOf,
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';
import { FakeConversationProvider } from './fake-provider';

const voices = [
  { id: 'cove', label: 'Cove' },
  { id: 'sol', label: 'Sol', description: 'Savvy and relaxed' },
];

const withVoices = (): ReturnType<typeof startConversationEngine> =>
  startConversationEngine(new FakeConversationProvider({ connect: 'manual', voices }));

describe('Conversation preview', () => {
  it('speaks one greeting in the chosen voice from a listening-only offer and answers it', async () => {
    const { host, provider } = await withVoices();

    const output = await host.caller.voice.preview({ voice: 'sol', offer });

    expect(output).toEqual({ answer: `fake-answer:${offer}` });
    expect(provider.previews.map(({ request }) => request)).toEqual([
      {
        offer,
        voice: 'sol',
        words: "Hi, I'm Sol. This is how I'll sound on your calls.",
      },
    ]);
  });

  it('hangs up by itself once the voice has said its greeting', async () => {
    const { host, provider } = await withVoices();
    await host.caller.voice.preview({ voice: 'cove', offer });
    const preview = provider.previewing;

    preview.emit({ type: 'speaking', speaking: true });
    expect(preview.ended).toBe(false);
    preview.emit({ type: 'speaking', speaking: false });

    expect(preview.ended).toBe(true);
  });

  it('ends the first preview when another voice is picked', async () => {
    const { host, provider } = await withVoices();

    await host.caller.voice.preview({ voice: 'cove', offer });
    await host.caller.voice.preview({ voice: 'sol', offer });

    expect(provider.previews.map(({ ended }) => ended)).toEqual([true, false]);
  });

  it('shows no call and is tied to no Session', async () => {
    const { host, provider } = await withVoices();

    await host.caller.voice.preview({ voice: 'cove', offer });
    provider.previewing.connect();
    provider.previewing.voiceSays("Hi, I'm Cove.");

    expect(await host.caller.conversation.status()).toMatchObject({
      call: null,
      ended: null,
      partials: [],
    });
  });

  it('is refused while a Conversation runs', async () => {
    const voice = await withVoices();
    const { sessionId } = await openConversationSession(voice);
    await voice.host.caller.conversation.start({ sessionId, offer });

    await expect(
      voice.host.caller.voice.preview({ voice: 'cove', offer }),
    ).rejects.toThrow(/Conversation is already running/);
    expect(voice.provider.previews).toEqual([]);
  });

  it('ends when a Conversation starts', async () => {
    const voice = await withVoices();
    const { sessionId } = await openConversationSession(voice);
    await voice.host.caller.voice.preview({ voice: 'cove', offer });

    await voice.host.caller.conversation.start({ sessionId, offer });

    expect(voice.provider.previewing.ended).toBe(true);
    expect(await callOf(voice.host)).not.toBeNull();
  });

  it('refuses a voice the provider does not list', async () => {
    const { host, provider } = await withVoices();

    await expect(
      host.caller.voice.preview({ voice: 'nobody', offer }),
    ).rejects.toThrow(/no voice nobody/);
    expect(provider.previews).toEqual([]);
  });

  it('lists the description a provider publishes for a voice', async () => {
    const { host } = await withVoices();

    expect((await host.caller.conversation.getSettings()).voices).toEqual(voices);
  });
});
