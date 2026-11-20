import type { VoicePreviewClip, VoicePreviewClipInput } from '@repo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { FakeConversationConnection } from '../../../../mocks/conversation/fake-conversation-connection';
import { VoicePreviewer, type PreviewServer } from './voice-previewer';

const clip = { mimeType: 'audio/webm', data: 'AAEC' };

const other = { mimeType: 'audio/webm', data: 'AwQF' };

// A Server holding the clips stored so far, by voice, that a test can slow down or make fail.
class FakeServer implements PreviewServer {
  public readonly asks: string[] = [];
  public readonly stores: string[] = [];
  public failLookup = false;
  public failAnswer = false;
  public failStore = false;
  // Voices whose lookup waits for the promise.
  public readonly gates = new Map<string, Promise<void>>();

  public constructor(
    public readonly stored: Record<string, VoicePreviewClip> = {},
  ) {}

  public async clipOf({
    voice,
  }: VoicePreviewClipInput): Promise<VoicePreviewClip | null> {
    await this.gates.get(voice);

    if (this.failLookup) throw new Error('offline');

    return this.stored[voice] ?? null;
  }

  public answer(
    { voice }: VoicePreviewClipInput,
    offer: string,
  ): Promise<string> {
    this.asks.push(voice);

    return this.failAnswer
      ? Promise.reject(new Error('A call is running'))
      : Promise.resolve(`answer to ${offer}`);
  }

  public storeClip(
    { voice }: VoicePreviewClipInput,
    kept: VoicePreviewClip,
  ): Promise<void> {
    if (this.failStore) return Promise.reject(new Error('offline'));
    this.stores.push(voice);
    this.stored[voice] = kept;

    return Promise.resolve();
  }
}

// A connection whose live preview asks for its answer at once and hands its recording over when a test says so.
class LiveConnection extends FakeConversationConnection {
  public readonly live: string[] = [];
  public ended = 0;
  public recorded: ((clip: VoicePreviewClip) => void) | undefined;

  public override async preview(
    answerFor: (offer: string) => Promise<string>,
    onRecorded?: (clip: VoicePreviewClip) => void,
  ): Promise<void> {
    this.live.push(await answerFor('offer'));
    this.recorded = onRecorded;
  }

  public override endPreview(): void {
    this.ended += 1;
  }
}

describe('Voice previewer', () => {
  it('plays the live preview the first time and keeps the greeting it recorded', async () => {
    const connection = new LiveConnection();
    const server = new FakeServer();

    await new VoicePreviewer(connection, server).play({ voice: 'cove' });
    connection.recorded?.(clip);
    await vi.waitFor(() => expect(server.stores).toEqual(['cove']));

    expect(connection.live).toEqual(['answer to offer']);
    expect(connection.clips).toEqual([]);
  });

  it('plays the stored greeting the second time, with no provider call', async () => {
    const connection = new LiveConnection();
    const server = new FakeServer({ cove: clip });

    await new VoicePreviewer(connection, server).play({ voice: 'cove' });

    expect(connection.clips).toEqual([clip]);
    expect(connection.live).toEqual([]);
    expect(server.asks).toEqual([]);
  });

  it('stops what plays when another voice is picked, and plays the new one', async () => {
    const connection = new LiveConnection();

    const previewer = new VoicePreviewer(
      connection,
      new FakeServer({ cove: clip, sol: other }),
    );

    await previewer.play({ voice: 'cove' });
    const endedBefore = connection.ended;
    await previewer.play({ voice: 'sol' });

    expect(connection.ended).toBeGreaterThan(endedBefore);
    expect(connection.clips).toEqual([clip, other]);
  });

  it('plays only the voice picked last when an earlier one is still being looked up', async () => {
    const connection = new LiveConnection();
    const server = new FakeServer({ cove: clip, sol: other });
    const gate = Promise.withResolvers<void>();
    server.gates.set('cove', gate.promise);

    const previewer = new VoicePreviewer(connection, server);

    const first = previewer.play({ voice: 'cove' });
    await previewer.play({ voice: 'sol' });
    gate.resolve();
    await first;

    expect(connection.clips).toEqual([other]);
  });

  it('stops a live preview when another voice is picked, and keeps nothing from it', async () => {
    const connection = new LiveConnection();
    const server = new FakeServer({ sol: other });
    const previewer = new VoicePreviewer(connection, server);
    await previewer.play({ voice: 'cove' });
    const endedBefore = connection.ended;

    await previewer.play({ voice: 'sol' });

    expect(connection.ended).toBeGreaterThan(endedBefore);
    expect(server.stores).toEqual([]);
  });

  it('keeps nothing when the upload fails, and records again on the next tap', async () => {
    const connection = new LiveConnection();
    const server = new FakeServer();
    const previewer = new VoicePreviewer(connection, server);
    server.failStore = true;

    await previewer.play({ voice: 'cove' });
    connection.recorded?.(clip);
    await Promise.resolve();
    expect(server.stored).toEqual({});

    server.failStore = false;
    await previewer.play({ voice: 'cove' });
    connection.recorded?.(clip);
    await vi.waitFor(() => expect(server.stored).toEqual({ cove: clip }));

    expect(connection.live).toHaveLength(2);
  });

  it('plays live when the Server cannot say whether it holds a greeting', async () => {
    const connection = new LiveConnection();
    const server = new FakeServer();
    server.failLookup = true;

    await new VoicePreviewer(connection, server).play({ voice: 'cove' });

    expect(connection.live).toHaveLength(1);
  });

  it('plays nothing and says nothing when the live preview is refused', async () => {
    const server = new FakeServer();
    server.failAnswer = true;

    await expect(
      new VoicePreviewer(new FakeConversationConnection(), server).play({
        voice: 'cove',
      }),
    ).resolves.toBeUndefined();
  });
});
