import type {
  Microphone,
  VoiceEnvironment,
  VoicePeer,
  VoicePlayback,
} from '../../src/features/voice/webrtc-voice-connection';

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

export class FakeEnvironment implements VoiceEnvironment {
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
