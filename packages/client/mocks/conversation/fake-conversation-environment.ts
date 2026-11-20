import type { VoicePreviewClip } from '@repo/contracts';
import type {
  Microphone,
  ConversationEnvironment,
  VoicePeer,
  VoicePlayback,
  VoiceRecording,
} from '../../src/features/conversation/types/conversation-environment';

// The connection hands the stream straight to the environment, so a test never reads from it.
const conversationStream: MediaStream = Object.create(null);

class FakeMicrophone implements Microphone {
  public stopped = false;
  public muted = false;
  // How much the sound is raised or lowered before it is sent; 1 sends it as it is.
  public gain = 1;

  // null is the system's microphone.
  public constructor(public readonly device: string | null) {}

  public stop(): void {
    this.stopped = true;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public setGain(gain: number): void {
    this.gain = gain;
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

  // How loud the voice is now; a test lowers it to 0 when the voice falls silent.
  public voiceLevel = 0.7;

  public level(): number {
    return this.voiceLevel;
  }

  public spectrum(into: Float32Array): void {
    into.fill(this.voiceLevel);
  }
}

// A recording that keeps what was asked of it, and answers `finish` with the clip a test chose.
export class FakeRecording implements VoiceRecording {
  public cancelled = false;

  public constructor(private readonly clip: VoicePreviewClip | null) {}

  public finish(): Promise<VoicePreviewClip | null> {
    return Promise.resolve(this.clip);
  }

  public cancel(): void {
    this.cancelled = true;
  }
}

class FakePeer implements VoicePeer {
  public answered: string | undefined;
  public closed = false;
  // The microphone whose sound goes up now.
  public sending: Microphone | undefined;
  // How often the sound sent up was replaced without a new offer.
  public replaced = 0;
  private listener: ((stream: MediaStream) => void) | undefined;

  public offer(microphone: Microphone): Promise<string> {
    this.sending = microphone;

    return Promise.resolve('v=0 offer');
  }

  public replaceMicrophone(microphone: Microphone): Promise<void> {
    this.sending = microphone;
    this.replaced += 1;

    return Promise.resolve();
  }

  public accept(answer: string): Promise<void> {
    this.answered = answer;

    return Promise.resolve();
  }

  public onVoice(listener: (stream: MediaStream) => void): void {
    this.listener = listener;
  }

  public voiceArrives(): void {
    this.listener?.(conversationStream);
  }

  public close(): void {
    this.closed = true;
  }
}

export class FakeEnvironment implements ConversationEnvironment {
  // Every peer made, oldest first; the latest is `peer`.
  public readonly peers: FakePeer[] = [];
  // Each call opens a new microphone, as the browser does, so the latest one is the call's.
  public microphone = new FakeMicrophone(null);
  // How often the microphone was opened.
  public microphonesOpened = 0;
  // The silence a listening-only connection sends, the latest one made.
  public silence = new FakeMicrophone(null);
  public readonly playback = new FakePlayback();
  // Microphones that were taken out: opening one fails, as the browser's exact constraint does.
  public readonly missing = new Set<string>();

  public constructor(private readonly refuse = false) {}

  public openMicrophone(device: string | null): Promise<Microphone> {
    if (this.refuses(device)) return Promise.reject(new Error('denied'));

    this.microphone = new FakeMicrophone(device);
    this.microphonesOpened += 1;

    return Promise.resolve(this.microphone);
  }

  public openSilence(): Microphone {
    this.silence = new FakeMicrophone(null);

    return this.silence;
  }

  private refuses(device: string | null): boolean {
    return this.refuse || (device !== null && this.missing.has(device));
  }

  public createPeer(): VoicePeer {
    const peer = new FakePeer();
    this.peers.push(peer);

    return peer;
  }

  public get peer(): FakePeer {
    const peer = this.peers.at(-1);

    if (!peer) throw new Error('No peer was made');

    return peer;
  }

  public playVoice(_voice: MediaStream, speaker: string | null): VoicePlayback {
    this.playback.speaker = speaker;

    return this.playback;
  }

  public recorded: VoicePreviewClip | null = {
    mimeType: 'audio/webm',
    data: 'AAEC',
  };
  public canRecord = true;
  public readonly recordings: FakeRecording[] = [];
  // Every stored greeting played, oldest first, and the playback of the latest.
  public readonly clipsPlayed: VoicePreviewClip[] = [];
  public clipPlayback = new FakePlayback();

  public recordVoice(): VoiceRecording | null {
    if (!this.canRecord) return null;
    const recording = new FakeRecording(this.recorded);
    this.recordings.push(recording);

    return recording;
  }

  public playClip(
    clip: VoicePreviewClip,
    speaker: string | null,
  ): VoicePlayback {
    this.clipsPlayed.push(clip);
    this.clipPlayback = new FakePlayback();
    this.clipPlayback.speaker = speaker;

    return this.clipPlayback;
  }
}
