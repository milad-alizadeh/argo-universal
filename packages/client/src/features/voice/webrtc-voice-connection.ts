import type {
  VoiceConnection,
  VoiceLevels,
  VoiceMutes,
} from './voice-connection';
import { VoiceMuteStore } from './voice-mute-store';

// The microphone as the connection uses it: something to let go of. The browser's own carries the sound.
export interface Microphone {
  stop: () => void;
  setMuted: (muted: boolean) => void;
  // How loud it is now, from 0 to 1.
  level: () => number;
}

// The voice as it plays: something to silence and to let go of.
export interface VoicePlayback {
  stop: () => void;
  // 0 is silent and 1 is full.
  setVolume: (volume: number) => void;
  level: () => number;
}

// A peer connection reduced to what a call needs.
export interface VoicePeer {
  // Sends the microphone up and opens the channel the provider expects; returns the complete offer.
  offer: (microphone: Microphone) => Promise<string>;
  accept: (answer: string) => Promise<void>;
  // Calls the listener with the voice's sound when it arrives.
  onVoice: (listener: (stream: MediaStream) => void) => void;
  close: () => void;
}

// What the connection needs from the browser, so a test can stand in for it.
export interface VoiceEnvironment {
  openMicrophone: () => Promise<Microphone>;
  // Silence to send in place of the microphone, for a connection that only listens.
  openSilence: () => Microphone;
  createPeer: () => VoicePeer;
  playVoice: (stream: MediaStream) => VoicePlayback;
}

// The microphone was refused or is missing; the call cannot start.
export class MicrophoneUnavailable extends Error {
  public constructor() {
    super('Microphone access is needed to talk.');
  }
}

const noLevels: VoiceLevels = { input: 0, output: 0 };

// How long a preview may hold its connection; the Server hangs up sooner, once the greeting is said.
const previewLimitMs = 30_000;

// What one call holds until it is released: the microphone, the peer and the voice's playback.
class HeldCall {
  public playback: VoicePlayback | undefined;
  public speakerMuted = false;

  public constructor(
    public readonly microphone: Microphone,
    public readonly peer: VoicePeer,
  ) {}

  public play(playback: VoicePlayback): void {
    this.playback = playback;
    this.setSpeakerMuted(this.speakerMuted);
  }

  public setSpeakerMuted(muted: boolean): void {
    this.speakerMuted = muted;
    this.playback?.setVolume(muted ? 0 : 1);
  }

  public levels(): VoiceLevels {
    return {
      input: this.microphone.level(),
      output: this.playback?.level() ?? 0,
    };
  }

  public release(): void {
    this.playback?.stop();
    this.microphone.stop();
    this.peer.close();
  }
}

/*
 * The App's side of a call on a browser or Electron page: the microphone goes up and the voice comes down.
 * Nothing is recorded or stored; audio only travels between the peer connection and the speaker.
 */
class WebRtcVoiceConnection implements VoiceConnection {
  private held: HeldCall | undefined;
  private previewing: HeldCall | undefined;
  private previewTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly store = new VoiceMuteStore();

  public constructor(private readonly environment: VoiceEnvironment) {}

  public async createOffer(): Promise<string> {
    this.close();
    this.endPreview();

    const microphone = await this.environment.openMicrophone().catch(() => {
      throw new MicrophoneUnavailable();
    });

    const held = this.hold(microphone);
    this.held = held;

    return held.peer.offer(microphone);
  }

  public async preview(
    answerFor: (offer: string) => Promise<string>,
  ): Promise<void> {
    const held = this.startPreview();

    try {
      await held.peer.accept(
        await answerFor(await held.peer.offer(held.microphone)),
      );
    } catch (error) {
      if (this.previewing === held) this.endPreview();
      throw error;
    }
  }

  // A new preview in place of any earlier one, let go of after a while.
  private startPreview(): HeldCall {
    this.endPreview();
    this.previewing = this.hold(this.environment.openSilence());
    this.previewTimer = setTimeout(() => this.endPreview(), previewLimitMs);

    return this.previewing;
  }

  public endPreview(): void {
    const { previewing } = this;
    this.previewing = undefined;
    clearTimeout(this.previewTimer);
    previewing?.release();
  }

  // A connection holding what it sends up, playing the voice when it arrives.
  private hold(microphone: Microphone): HeldCall {
    const held = new HeldCall(microphone, this.environment.createPeer());

    held.peer.onVoice((voice) => held.play(this.environment.playVoice(voice)));

    return held;
  }

  public async accept(answer: string): Promise<void> {
    await this.held?.peer.accept(answer);
  }

  public setMicrophoneMuted(muted: boolean): void {
    if (!this.held) return;
    this.held.microphone.setMuted(muted);
    this.store.change({ microphone: muted });
  }

  public setSpeakerMuted(muted: boolean): void {
    if (!this.held) return;
    this.held.setSpeakerMuted(muted);
    this.store.change({ speaker: muted });
  }

  public mutes = (): VoiceMutes => this.store.read();

  public subscribe = (listener: () => void): (() => void) =>
    this.store.subscribe(listener);

  public levels(): VoiceLevels {
    return this.held?.levels() ?? noLevels;
  }

  public close(): void {
    const { held } = this;
    this.held = undefined;
    this.store.reset();
    held?.release();
  }
}

export const createWebRtcVoiceConnection = (
  environment: VoiceEnvironment,
): VoiceConnection => new WebRtcVoiceConnection(environment);
