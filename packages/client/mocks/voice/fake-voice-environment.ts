import type {
  Microphone,
  VoiceEnvironment,
  VoicePeer,
  VoicePlayback,
} from '../../src/features/voice/voice-environment';

// The connection hands the stream straight to the environment, so a test never reads from it.
const voiceStream: MediaStream = Object.create(null);

class FakeMicrophone implements Microphone {
  public stopped = false;
  public muted = false;

  // null is the system's microphone.
  public constructor(public readonly device: string | null) {}

  public stop(): void {
    this.stopped = true;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public level(): number {
    return 0.4;
  }

  public spectrum(into: Float32Array): void {
    into.fill(this.muted ? 0 : 0.4);
  }
}

class FakePlayback implements VoicePlayback {
  public stopped = false;
  public volume = 1;
  // null is the system's speaker.
  public speaker: string | null = null;

  public stop(): void {
    this.stopped = true;
  }

  public setVolume(volume: number): void {
    this.volume = volume;
  }

  public setSpeaker(speaker: string | null): void {
    this.speaker = speaker;
  }

  public level(): number {
    return 0.7;
  }

  public spectrum(into: Float32Array): void {
    into.fill(0.7);
  }
}

class FakePeer implements VoicePeer {
  public answered: string | undefined;
  public closed = false;
  // The microphone whose sound goes up now.
  public sending: Microphone | undefined;
  private listener: ((stream: MediaStream) => void) | undefined;

  public offer(microphone: Microphone): Promise<string> {
    this.sending = microphone;

    return Promise.resolve('v=0 offer');
  }

  public replaceMicrophone(microphone: Microphone): Promise<void> {
    this.sending = microphone;

    return Promise.resolve();
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
  public microphone = new FakeMicrophone(null);
  public readonly playback = new FakePlayback();
  // Microphones that were taken out: opening one fails, as the browser's exact constraint does.
  public readonly missing = new Set<string>();

  public constructor(private readonly refuse = false) {}

  public openMicrophone(device: string | null): Promise<Microphone> {
    if (this.refuses(device)) return Promise.reject(new Error('denied'));

    this.microphone = new FakeMicrophone(device);

    return Promise.resolve(this.microphone);
  }

  private refuses(device: string | null): boolean {
    return this.refuse || (device !== null && this.missing.has(device));
  }

  public createPeer(): VoicePeer {
    return this.peer;
  }

  public playVoice(_voice: MediaStream, speaker: string | null): VoicePlayback {
    this.playback.speaker = speaker;

    return this.playback;
  }
}
