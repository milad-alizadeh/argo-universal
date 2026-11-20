import { describe, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';
import { FakeConversationProvider } from './fake-provider';

const builtIn = [
  { id: 'first', label: 'First', description: 'Bright and quick' },
  { id: 'second', label: 'Second' },
];

const pirate = {
  label: 'Pirate',
  baseVoice: 'second',
  description: 'Speaks like a cheerful pirate, slowly.',
};

const pirateGreeting = {
  offer,
  voice: 'second',
  style: pirate.description,
  words: "Hi, I'm Pirate. This is how I'll sound on your calls.",
};

const gone = 'custom-gone';

const callMeSam = 'Call me Sam.';

const withVoices = (): ReturnType<typeof startConversationEngine> =>
  startConversationEngine(
    new FakeConversationProvider({ connect: 'manual', voices: builtIn }),
  );

describe('Custom voices', () => {
  it('lists the built-in voices, then the custom ones, each with its description', async () => {
    const { host } = await withVoices();

    const saved = await host.caller.voice.saveCustomVoice(pirate);

    expect(await host.caller.voice.listVoices()).toEqual({
      voices: [
        {
          kind: 'builtIn',
          id: 'first',
          label: 'First',
          description: 'Bright and quick',
        },
        { kind: 'builtIn', id: 'second', label: 'Second' },
        { kind: 'custom', id: saved.id, ...pirate },
      ],
    });
  });

  it('changes the custom voice its id names, in place', async () => {
    const { host } = await withVoices();
    const saved = await host.caller.voice.saveCustomVoice(pirate);
    const changed = { ...saved, label: 'Captain', baseVoice: 'first' };

    await expect(host.caller.voice.saveCustomVoice(changed)).resolves.toEqual(
      changed,
    );

    expect((await host.caller.voice.listVoices()).voices).toEqual([
      expect.objectContaining({ id: 'first' }),
      expect.objectContaining({ id: 'second' }),
      { kind: 'custom', ...changed },
    ]);
  });

  it('deletes a custom voice, and a call chosen with it falls back to the first voice', async () => {
    const { host } = await withVoices();
    const saved = await host.caller.voice.saveCustomVoice(pirate);
    await host.caller.voice.setVoice({ voice: saved.id });

    await host.caller.voice.deleteCustomVoice({ id: saved.id });

    expect((await host.caller.voice.listVoices()).voices).toHaveLength(2);
    expect((await host.caller.conversation.getSettings()).voice).toBe('first');
  });

  it('refuses a base voice the provider does not have, and a custom voice that is not there', async () => {
    const { host } = await withVoices();

    await expect(
      host.caller.voice.saveCustomVoice({ ...pirate, baseVoice: 'nobody' }),
    ).rejects.toThrow('nobody');
    await expect(
      host.caller.voice.saveCustomVoice({ ...pirate, id: gone }),
    ).rejects.toThrow(gone);
    await expect(
      host.caller.voice.deleteCustomVoice({ id: gone }),
    ).rejects.toThrow(gone);
    await expect(host.caller.voice.setVoice({ voice: gone })).rejects.toThrow(
      gone,
    );
  });

  it("gives the next call a custom voice's base voice, its description and the custom instructions", async () => {
    const voice = await withVoices();
    const { host, provider } = voice;
    const { sessionId } = await openConversationSession(voice);
    const saved = await host.caller.voice.saveCustomVoice(pirate);
    await host.caller.voice.setVoice({ voice: saved.id });
    await host.caller.conversation.setInstructions({ instructions: callMeSam });

    await host.caller.conversation.start({ sessionId, offer });

    expect(provider.call.request).toMatchObject({
      voice: 'second',
      style: pirate.description,
      instructions: callMeSam,
    });
  });

  it('gives a built-in voice with no style, and no instructions once they are cleared', async () => {
    const voice = await withVoices();
    const { host, provider } = voice;
    const { sessionId } = await openConversationSession(voice);
    await host.caller.conversation.setInstructions({ instructions: callMeSam });
    await host.caller.conversation.setInstructions({ instructions: '  ' });

    await host.caller.conversation.start({ sessionId, offer });

    expect(provider.call.request.voice).toBe('first');
    expect(provider.call.request.style).toBeUndefined();
    expect(provider.call.request.instructions).toBeUndefined();
    expect((await host.caller.conversation.getSettings()).instructions).toBe(
      '',
    );
  });

  it('previews a saved custom voice in its base voice and its style', async () => {
    const { host, provider } = await withVoices();
    const saved = await host.caller.voice.saveCustomVoice(pirate);

    await host.caller.voice.preview({ voice: saved.id, offer });

    expect(provider.previewing.request).toEqual(pirateGreeting);
  });

  it('previews a custom voice before it is saved', async () => {
    const { host, provider } = await withVoices();

    await host.caller.voice.preview({
      voice: pirate.baseVoice,
      offer,
      custom: { label: pirate.label, description: pirate.description },
    });

    expect(provider.previewing.request).toEqual(pirateGreeting);
    expect((await host.caller.voice.listVoices()).voices).toHaveLength(2);
  });

  it('keeps custom voices across an Engine restart', async () => {
    const { host } = await withVoices();
    const saved = await host.caller.voice.saveCustomVoice(pirate);
    await host.stop();

    const restarted = await startAcpEngine({
      steps: [],
      restartOver: host.home,
      conversationProvider: new FakeConversationProvider({ voices: builtIn }),
    });

    expect((await restarted.caller.voice.listVoices()).voices).toContainEqual({
      kind: 'custom',
      id: saved.id,
      ...pirate,
    });
  });
});
