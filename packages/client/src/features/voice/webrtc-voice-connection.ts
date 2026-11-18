import type { VoiceConnection } from './voice-connection';

// The microphone as the connection uses it: something to let go of. The browser's own carries the sound.
export interface Microphone {
  stop: () => void;
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
  createPeer: () => VoicePeer;
  // Plays the voice; returns the function that stops it.
  playVoice: (stream: MediaStream) => () => void;
}

// The microphone was refused or is missing; the call cannot start.
export class MicrophoneUnavailable extends Error {
  public constructor() {
    super('Microphone access is needed to talk.');
  }
}

// What one call holds until it is released: the microphone, the peer and the voice's playback.
class HeldCall {
  public stopPlaying: (() => void) | undefined;

  public constructor(
    public readonly microphone: Microphone,
    public readonly peer: VoicePeer,
  ) {}

  public release(): void {
    this.stopPlaying?.();
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

  public constructor(private readonly environment: VoiceEnvironment) {}

  public async createOffer(): Promise<string> {
    this.close();
    const microphone = await this.environment.openMicrophone().catch(() => {
      throw new MicrophoneUnavailable();
    });
    const held = new HeldCall(microphone, this.environment.createPeer());
    this.held = held;
    held.peer.onVoice((voice) => {
      held.stopPlaying = this.environment.playVoice(voice);
    });

    return held.peer.offer(microphone);
  }

  public async accept(answer: string): Promise<void> {
    await this.held?.peer.accept(answer);
  }

  public close(): void {
    const { held } = this;
    this.held = undefined;
    held?.release();
  }
}

export const createWebRtcVoiceConnection = (
  environment: VoiceEnvironment,
): VoiceConnection => new WebRtcVoiceConnection(environment);
