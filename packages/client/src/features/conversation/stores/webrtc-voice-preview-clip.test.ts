import type { VoicePreviewClip } from '@repo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeEnvironment } from '../../../../mocks/conversation/fake-conversation-environment';
import { createWebRtcVoiceConnection } from './webrtc-conversation-connection';

const answerFor = (offer: string): Promise<string> =>
  Promise.resolve(`answer to ${offer}`);

const clip = { mimeType: 'audio/webm', data: 'AAEC' };

type Recorded = (clip: VoicePreviewClip) => void;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// The voice speaks, then falls silent.
const greetingHeard = (environment: FakeEnvironment): void => {
  environment.peer.voiceArrives();
  vi.advanceTimersByTime(500);
  environment.playback.voiceLevel = 0;
  vi.advanceTimersByTime(2000);
};

describe('WebRTC voice preview recording', () => {
  it('hands over the greeting once the voice has said it and gone quiet', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    const recorded = vi.fn<Recorded>();

    await connection.preview(answerFor, recorded);
    environment.peer.voiceArrives();
    vi.advanceTimersByTime(500);
    expect(recorded).not.toHaveBeenCalled();
    environment.playback.voiceLevel = 0;
    await vi.advanceTimersByTimeAsync(2000);

    expect(recorded).toHaveBeenCalledExactlyOnceWith(clip);
  });

  it('records nothing when it was not asked to', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);

    await connection.preview(answerFor);
    greetingHeard(environment);

    expect(environment.recordings).toEqual([]);
  });

  it('throws the recording away when the preview is let go of before the greeting is said', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    const recorded = vi.fn<Recorded>();
    await connection.preview(answerFor, recorded);
    environment.peer.voiceArrives();
    vi.advanceTimersByTime(500);

    connection.endPreview();
    environment.playback.voiceLevel = 0;
    await vi.advanceTimersByTimeAsync(2000);

    expect(environment.recordings[0]?.cancelled).toBe(true);
    expect(recorded).not.toHaveBeenCalled();
  });

  it('throws the recording away when another preview replaces it', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    const recorded = vi.fn<Recorded>();
    await connection.preview(answerFor, recorded);
    environment.peer.voiceArrives();

    await connection.preview(answerFor);
    environment.playback.voiceLevel = 0;
    await vi.advanceTimersByTimeAsync(2000);

    expect(environment.recordings[0]?.cancelled).toBe(true);
    expect(recorded).not.toHaveBeenCalled();
  });

  it('hands over nothing when the recorder gave nothing', async () => {
    const environment = new FakeEnvironment();
    environment.recorded = null;
    const connection = createWebRtcVoiceConnection(environment);
    const recorded = vi.fn<Recorded>();
    await connection.preview(answerFor, recorded);

    environment.peer.voiceArrives();
    vi.advanceTimersByTime(500);
    environment.playback.voiceLevel = 0;
    await vi.advanceTimersByTimeAsync(2000);

    expect(recorded).not.toHaveBeenCalled();
  });

  it('still plays live where the page cannot record', async () => {
    const environment = new FakeEnvironment();
    environment.canRecord = false;
    const connection = createWebRtcVoiceConnection(environment);
    const recorded = vi.fn<Recorded>();

    await connection.preview(answerFor, recorded);
    environment.peer.voiceArrives();
    environment.playback.voiceLevel = 0;
    await vi.advanceTimersByTimeAsync(2000);

    expect(environment.playback.stopped).toBe(false);
    expect(recorded).not.toHaveBeenCalled();
  });
});

describe('WebRTC voice stored greeting', () => {
  it('plays a stored greeting on the chosen speaker, with no peer connection', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);

    connection.playClip(clip);

    expect(environment.clipsPlayed).toEqual([clip]);
    expect(environment.peers).toEqual([]);
  });

  it('stops the greeting playing when another preview starts', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    connection.playClip(clip);
    const first = environment.clipPlayback;

    await connection.preview(answerFor);

    expect(first.stopped).toBe(true);
  });

  it('stops a live preview when a stored greeting plays', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    await connection.preview(answerFor);

    connection.playClip(clip);

    expect(environment.peer.closed).toBe(true);
  });

  it('stops the greeting when the preview is let go of, and when a call starts', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    connection.playClip(clip);
    connection.endPreview();
    expect(environment.clipPlayback.stopped).toBe(true);

    connection.playClip(clip);
    await connection.createOffer();

    expect(environment.clipPlayback.stopped).toBe(true);
  });

  it('plays at the volume the person chose', () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    connection.setSound({ volume: 40, microphoneGain: 100 });

    connection.playClip(clip);

    expect(environment.clipPlayback.volume).toBeCloseTo(0.4);
  });
});
