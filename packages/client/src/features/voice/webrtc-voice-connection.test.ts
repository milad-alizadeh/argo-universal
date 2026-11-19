import { describe, expect, it } from 'vitest';
import {
  createWebRtcVoiceConnection,
  MicrophoneUnavailable,
  type Microphone,
  type VoiceEnvironment,
  type VoicePeer,
  type VoicePlayback,
} from './webrtc-voice-connection';

// The connection hands the stream straight to the environment, so a test never reads from it.
const voiceStream: MediaStream = Object.create(null);

class FakeMicrophone implements Microphone {
  public stopped = false;
  public muted = false;

  public stop(): void {
    this.stopped = true;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public level(): number {
    return 0.4;
  }
}

class FakePlayback implements VoicePlayback {
  public stopped = false;
  public volume = 1;

  public stop(): void {
    this.stopped = true;
  }

  public setVolume(volume: number): void {
    this.volume = volume;
  }

  public level(): number {
    return 0.7;
  }
}

class FakePeer implements VoicePeer {
  public answered: string | undefined;
  public closed = false;
  private listener: ((stream: MediaStream) => void) | undefined;

  public offer(): Promise<string> {
    return Promise.resolve('v=0 offer');
  }

  public accept(answer: string): Promise<void> {
    this.answered = answer;

    return Promise.resolve();
  }

  public onVoice(listener: (stream: MediaStream) => void): void {
    this.listener = listener;
  }

  // The voice's sound arrives.
  public voiceArrives(): void {
    this.listener?.(voiceStream);
  }

  public close(): void {
    this.closed = true;
  }
}

class FakeEnvironment implements VoiceEnvironment {
  public readonly peer = new FakePeer();
  // Each call opens a new microphone, as the browser does, so the latest one is the call's.
  public microphone = new FakeMicrophone();
  public readonly playback = new FakePlayback();

  public constructor(private readonly refuse = false) {}

  public openMicrophone(): Promise<Microphone> {
    if (this.refuse) return Promise.reject(new Error('denied'));

    this.microphone = new FakeMicrophone();

    return Promise.resolve(this.microphone);
  }

  public createPeer(): VoicePeer {
    return this.peer;
  }

  public playVoice(): VoicePlayback {
    return this.playback;
  }
}

async function started(refuse = false): Promise<{
  environment: FakeEnvironment;
  connection: ReturnType<typeof createWebRtcVoiceConnection>;
}> {
  const environment = new FakeEnvironment(refuse);
  const connection = createWebRtcVoiceConnection(environment);
  await connection.createOffer();

  return { environment, connection };
}

describe('WebRTC voice connection', () => {
  it('offers the microphone, completes with the answer, and releases everything on close', async () => {
    const { environment, connection } = await started();

    await connection.accept('v=0 answer');
    expect(environment.peer.answered).toBe('v=0 answer');
    connection.close();
    expect(environment.microphone.stopped).toBe(true);
    expect(environment.peer.closed).toBe(true);
  });

  it('cannot start a call when the microphone is refused', async () => {
    await expect(started(true)).rejects.toBeInstanceOf(MicrophoneUnavailable);
  });

  it('mutes the microphone without ending the call', async () => {
    const { environment, connection } = await started();

    connection.setMicrophoneMuted(true);
    expect(environment.microphone.muted).toBe(true);
    expect(environment.peer.closed).toBe(false);
    connection.setMicrophoneMuted(false);
    expect(environment.microphone.muted).toBe(false);
  });

  it('silences the voice by setting its volume to zero, without ending the call', async () => {
    const { environment, connection } = await started();
    environment.peer.voiceArrives();

    connection.setSpeakerMuted(true);
    expect(environment.playback.volume).toBe(0);
    expect(environment.playback.stopped).toBe(false);
    expect(environment.peer.closed).toBe(false);
    connection.setSpeakerMuted(false);
    expect(environment.playback.volume).toBe(1);
  });

  it('keeps the voice silent when it arrives after the speaker was muted', async () => {
    const { environment, connection } = await started();

    connection.setSpeakerMuted(true);
    environment.peer.voiceArrives();
    expect(environment.playback.volume).toBe(0);
  });

  it('reads the microphone and voice levels, and none once closed', async () => {
    const { environment, connection } = await started();
    expect(connection.levels()).toEqual({ input: 0.4, output: 0 });
    environment.peer.voiceArrives();
    expect(connection.levels()).toEqual({ input: 0.4, output: 0.7 });
    connection.close();
    expect(connection.levels()).toEqual({ input: 0, output: 0 });
  });

  it('holds the mutes itself, and tells whoever listens when they change', async () => {
    const { connection } = await started();
    const heard: boolean[] = [];
    connection.subscribe(() => heard.push(connection.mutes().microphone));

    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
    connection.setMicrophoneMuted(true);
    connection.setSpeakerMuted(true);
    expect(connection.mutes()).toEqual({ microphone: true, speaker: true });
    expect(heard).toEqual([true, true]);
  });

  it('keeps the same mutes object until something changes, for a store to read', async () => {
    const { connection } = await started();
    const before = connection.mutes();
    connection.setMicrophoneMuted(false);

    expect(connection.mutes()).toBe(before);
  });

  it('stops telling a listener that unsubscribed', async () => {
    const { connection } = await started();
    const heard: number[] = [];
    const stop = connection.subscribe(() => heard.push(1));
    stop();
    connection.setMicrophoneMuted(true);

    expect(heard).toEqual([]);
  });

  it('starts every call unmuted, because a new call is a new connection', async () => {
    const { environment, connection } = await started();
    connection.setMicrophoneMuted(true);
    connection.setSpeakerMuted(true);

    await connection.createOffer();
    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
    expect(environment.microphone.muted).toBe(false);
  });

  it('is unmuted once the call is over', async () => {
    const { connection } = await started();
    connection.setMicrophoneMuted(true);
    connection.close();

    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
  });

  it('ignores a mute before there is a call, and the call still starts unmuted', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    connection.setMicrophoneMuted(true);
    connection.setSpeakerMuted(true);
    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });

    await connection.createOffer();
    expect(environment.microphone.muted).toBe(false);
    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
  });
});
