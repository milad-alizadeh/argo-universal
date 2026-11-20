import { describe, expect, it } from 'vitest';
import { offer, startConversationEngine } from '#mocks/conversation-engine';
import { FakeConversationProvider } from './fake-provider';

const voices = [
  { id: 'cove', label: 'Cove' },
  { id: 'sol', label: 'Sol' },
];

const withVoices = (): ReturnType<typeof startConversationEngine> =>
  startConversationEngine(new FakeConversationProvider({ connect: 'manual', voices }));

const clip = { mimeType: 'audio/webm', data: 'AAEC' };

describe('Conversation preview clips', () => {
  it('has no clip until the App stores one, then returns it with no provider call', async () => {
    const { host, provider } = await withVoices();
    expect(await host.caller.voice.getPreviewClip({ voice: 'cove' })).toEqual({
      clip: null,
    });

    expect(
      await host.caller.voice.storePreviewClip({ voice: 'cove', clip }),
    ).toEqual({ stored: true });

    expect(await host.caller.voice.getPreviewClip({ voice: 'cove' })).toEqual({
      clip,
    });
    expect(provider.previews).toEqual([]);
  });

  it('keeps a clip for the voice it was stored for', async () => {
    const { host } = await withVoices();
    await host.caller.voice.storePreviewClip({ voice: 'cove', clip });

    expect(await host.caller.voice.getPreviewClip({ voice: 'sol' })).toEqual({
      clip: null,
    });
  });

  it('keys a custom voice not saved yet by its name and description, so changing either records it again', async () => {
    const { host } = await withVoices();
    const calm = { label: 'Ada', description: 'Calm' };
    await host.caller.voice.storePreviewClip({
      voice: 'cove',
      custom: calm,
      clip,
    });

    expect(
      await host.caller.voice.getPreviewClip({ voice: 'cove', custom: calm }),
    ).toEqual({ clip });

    for (const custom of [
      { label: 'Ada', description: 'Brisk' },
      { label: 'Bea', description: 'Calm' },
      undefined,
    ])
      expect(
        await host.caller.voice.getPreviewClip({ voice: 'cove', custom }),
      ).toEqual({ clip: null });
  });

  it('keys a saved custom voice by its description, so editing it records it again', async () => {
    const { host } = await withVoices();

    const saved = await host.caller.voice.saveCustomVoice({
      label: 'Ada',
      baseVoice: 'cove',
      description: 'Calm',
    });

    await host.caller.voice.storePreviewClip({ voice: saved.id, clip });

    await host.caller.voice.saveCustomVoice({
      id: saved.id,
      label: 'Ada',
      baseVoice: 'cove',
      description: 'Brisk',
    });

    expect(await host.caller.voice.getPreviewClip({ voice: saved.id })).toEqual(
      { clip: null },
    );
  });

  it('refuses to store a clip for a voice the provider does not list', async () => {
    const { host } = await withVoices();

    await expect(
      host.caller.voice.storePreviewClip({ voice: 'nobody', clip }),
    ).rejects.toThrow(/no voice nobody/);
  });

  it('refuses a clip that is not audio', async () => {
    const { host } = await withVoices();

    await expect(
      host.caller.voice.storePreviewClip({
        voice: 'cove',
        clip: { mimeType: 'text/html', data: 'AAEC' },
      }),
    ).rejects.toThrow(/mimeType/);
  });

  it('does not change how a live preview opens', async () => {
    const { host, provider } = await withVoices();
    await host.caller.voice.storePreviewClip({ voice: 'cove', clip });

    await host.caller.voice.preview({ voice: 'cove', offer });

    expect(provider.previews).toHaveLength(1);
  });
});
