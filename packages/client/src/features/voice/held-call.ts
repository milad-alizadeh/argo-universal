import type { VoiceLevels, VoiceSpectrum } from './voice-connection';
import type { VoiceDeviceChoice } from './voice-device-choice';
import {
  MicrophoneUnavailable,
  type Microphone,
  type VoiceEnvironment,
  type VoicePeer,
  type VoicePlayback,
} from './voice-environment';

// The chosen microphone, or the system's when the chosen one is gone, so a missing device never fails the call.
export const openChosen = (
  environment: VoiceEnvironment,
  device: string | null,
): Promise<Microphone> =>
  environment
    .openMicrophone(device)
    .catch(() =>
      device === null
        ? Promise.reject(new MicrophoneUnavailable())
        : environment.openMicrophone(null),
    )
    .catch(() => {
      throw new MicrophoneUnavailable();
    });

// What one call holds until it is released: the microphone, the peer and the voice's playback.
export class HeldCall {
  public playback: VoicePlayback | undefined;
  private speakerMuted = false;
  private microphoneMuted = false;
  private released = false;

  public constructor(
    private microphone: Microphone,
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

  public setMicrophoneMuted(muted: boolean): void {
    this.microphoneMuted = muted;
    this.microphone.setMuted(muted);
  }

  // Moves the running call to the devices just chosen, live.
  public async follow(
    previous: VoiceDeviceChoice,
    choice: VoiceDeviceChoice,
    environment: VoiceEnvironment,
  ): Promise<void> {
    if (choice.speaker !== previous.speaker) this.moveSpeaker(choice.speaker);

    if (choice.microphone !== previous.microphone)
      await this.moveMicrophone(environment, choice.microphone);
  }

  private moveSpeaker(speaker: string | null): void {
    this.playback?.setSpeaker(speaker);
  }

  // When the new microphone cannot open, the call keeps the one it has.
  private async moveMicrophone(
    environment: VoiceEnvironment,
    device: string | null,
  ): Promise<void> {
    const microphone = await environment
      .openMicrophone(device)
      .catch(() => null);

    if (microphone) await this.swapMicrophone(microphone);
  }

  // Sends the new microphone up in the old one's place, muted as the old one was, then lets the old one go.
  private async swapMicrophone(microphone: Microphone): Promise<void> {
    if (this.released) return microphone.stop();

    microphone.setMuted(this.microphoneMuted);
    await this.peer.replaceMicrophone(microphone);
    const previous = this.microphone;
    this.microphone = microphone;
    previous.stop();
  }

  public levels(): VoiceLevels {
    return {
      input: this.microphone.level(),
      output: this.playback?.level() ?? 0,
    };
  }

  // Fills the spectrum from the microphone and the voice; the voice's is silent until it arrives.
  public spectrum(into: VoiceSpectrum): void {
    this.microphone.spectrum(into.input);

    if (this.playback) this.playback.spectrum(into.output);
    else into.output.fill(0);
  }

  public release(): void {
    this.released = true;
    this.playback?.stop();
    this.microphone.stop();
    this.peer.close();
  }
}
