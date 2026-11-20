import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeEnvironment } from '../../../../mocks/conversation/fake-conversation-environment';
import { createWebRtcVoiceConnection } from './webrtc-conversation-connection';

const answerFor = (offer: string): Promise<string> =>
  Promise.resolve(`answer to ${offer}`);

afterEach(() => {
  vi.useRealTimers();
});

describe('WebRTC voice preview', () => {
  it('only listens: it sends silence, never opens the microphone, and plays the voice', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);

    await connection.preview(answerFor);
    environment.peer.voiceArrives();

    expect(environment.microphonesOpened).toBe(0);
    expect(environment.peer.sending).toBe(environment.silence);
    expect(environment.peer.answered).toBe('answer to v=0 offer');
    expect(environment.playback.stopped).toBe(false);
  });

  it('lets go of the first preview when another starts', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);

    await connection.preview(answerFor);
    const first = { peer: environment.peer, silence: environment.silence };
    await connection.preview(answerFor);

    expect(first.peer.closed).toBe(true);
    expect(first.silence.stopped).toBe(true);
    expect(environment.peer.closed).toBe(false);
  });

  it('lets go of the preview when a call starts, and not when a call ends', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    await connection.preview(answerFor);
    const preview = environment.peer;

    connection.close();
    expect(preview.closed).toBe(false);
    await connection.createOffer();

    expect(preview.closed).toBe(true);
  });

  it('lets go of the preview when asked, or by itself once it has had time to play', async () => {
    vi.useFakeTimers();
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);

    await connection.preview(answerFor);
    connection.endPreview();
    expect(environment.peer.closed).toBe(true);

    await connection.preview(answerFor);
    vi.advanceTimersByTime(30_000);
    expect(environment.peer.closed).toBe(true);
    expect(environment.silence.stopped).toBe(true);
  });

  it('lets go of the preview when the Server gives no answer', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);

    await expect(
      connection.preview(() => Promise.reject(new Error('A call is running'))),
    ).rejects.toThrow('A call is running');
    expect(environment.peer.closed).toBe(true);
  });
});
