import { describe, expect, it } from 'vitest';
import { offer, openConversationSession, startConversationEngine } from '#mocks/conversation-engine';
import { FakeConversationProvider } from './fake-provider';

const first = { id: 'first', label: 'First' };

const second = { id: 'second', label: 'Second' };

const pirate = {
  label: 'Pirate',
  baseVoice: second.id,
  description: 'Speaks like a cheerful pirate, slowly.',
};

// GPT-Live dropped Marin, Porto and Selva: a custom voice built on one the provider no longer lists must still call.
describe("a custom voice's base voice", () => {
  it('cannot be a voice the provider does not list', async () => {
    const { host } = await startConversationEngine(
      new FakeConversationProvider({ voices: [first] }),
    );

    await expect(host.caller.voice.saveCustomVoice(pirate)).rejects.toThrow(
      /second/,
    );
  });

  it('falls back to the first voice once the provider no longer lists it, keeping the style', async () => {
    const before = await startConversationEngine(
      new FakeConversationProvider({ voices: [first, second] }),
    );

    const saved = await before.host.caller.voice.saveCustomVoice(pirate);
    await before.host.caller.voice.setVoice({ voice: saved.id });
    await before.host.stop();
    const provider = new FakeConversationProvider({ voices: [first] });

    const after = await startConversationEngine(provider, before.host.home);
    const { sessionId } = await openConversationSession(after);
    await after.host.caller.conversation.start({ sessionId, offer });

    expect(provider.call.request).toMatchObject({
      voice: first.id,
      style: pirate.description,
    });
  });

  it('previews a saved custom voice in the first voice once its base is no longer listed', async () => {
    const before = await startConversationEngine(
      new FakeConversationProvider({ voices: [first, second] }),
    );

    const saved = await before.host.caller.voice.saveCustomVoice(pirate);
    await before.host.stop();
    const provider = new FakeConversationProvider({ voices: [first] });

    const after = await startConversationEngine(provider, before.host.home);
    await after.host.caller.voice.preview({ voice: saved.id, offer });

    expect(provider.previewing.request).toMatchObject({ voice: first.id });
  });
});
