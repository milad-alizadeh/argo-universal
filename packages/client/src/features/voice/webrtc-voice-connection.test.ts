import { describe, expect, it } from 'vitest';
import {
  createWebRtcVoiceConnection,
  MicrophoneUnavailable,
  type VoiceEnvironment,
  type VoicePeer,
} from './webrtc-voice-connection';

class FakePeer implements VoicePeer {
  public answered: string | undefined;
  public closed = false;

  public offer(): Promise<string> {
    return Promise.resolve('v=0 offer');
  }

  public accept(answer: string): Promise<void> {
    this.answered = answer;

    return Promise.resolve();
  }

  public onVoice(): void {}

  public close(): void {
    this.closed = true;
  }
}

class FakeEnvironment implements VoiceEnvironment {
  public readonly peer = new FakePeer();
  public microphoneStopped = false;

  public constructor(private readonly refuse = false) {}

  public openMicrophone(): ReturnType<VoiceEnvironment['openMicrophone']> {
    if (this.refuse) return Promise.reject(new Error('denied'));

    return Promise.resolve({
      stop: (): void => {
        this.microphoneStopped = true;
      },
    });
  }

  public createPeer(): VoicePeer {
    return this.peer;
  }

  public playVoice(): () => void {
    return () => {};
  }
}

describe('WebRTC voice connection', () => {
  it('offers the microphone, completes with the answer, and releases everything on close', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);

    expect(await connection.createOffer()).toBe('v=0 offer');
    await connection.accept('v=0 answer');
    expect(environment.peer.answered).toBe('v=0 answer');
    connection.close();
    expect(environment.microphoneStopped).toBe(true);
    expect(environment.peer.closed).toBe(true);
  });

  it('cannot start a call when the microphone is refused', async () => {
    const connection = createWebRtcVoiceConnection(new FakeEnvironment(true));

    await expect(connection.createOffer()).rejects.toBeInstanceOf(
      MicrophoneUnavailable,
    );
  });
});
