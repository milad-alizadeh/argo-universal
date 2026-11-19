import { HeldCall, openChosen } from './held-call';
import {
  silentSpectrum,
  type VoiceConnection,
  type VoiceLevels,
  type VoiceMutes,
  type VoiceSpectrum,
} from './voice-connection';
import { systemDevices, type VoiceDeviceChoice } from './voice-device-choice';
import type { VoiceEnvironment } from './voice-environment';
import { VoiceMuteStore } from './voice-mute-store';

const noLevels: VoiceLevels = { input: 0, output: 0 };

/*
 * The App's side of a call on a browser or Electron page: the microphone goes up and the voice comes down.
 * Nothing is recorded or stored; audio only travels between the peer connection and the speaker.
 */
class WebRtcVoiceConnection implements VoiceConnection {
  private held: HeldCall | undefined;
  // The microphone and speaker this Device chose; every call starts on them.
  private devices = systemDevices;
  private readonly store = new VoiceMuteStore();
  // Refilled on every read, so a visualiser reading each frame makes no garbage.
  private readonly bands = silentSpectrum();

  public constructor(private readonly environment: VoiceEnvironment) {}

  public async createOffer(): Promise<string> {
    this.close();

    const microphone = await openChosen(
      this.environment,
      this.devices.microphone,
    );

    const held = new HeldCall(microphone, this.environment.createPeer());
    this.held = held;

    held.peer.onVoice((voice) =>
      held.play(this.environment.playVoice(voice, this.devices.speaker)),
    );

    return held.peer.offer(microphone);
  }

  public async accept(answer: string): Promise<void> {
    await this.held?.peer.accept(answer);
  }

  public setMicrophoneMuted(muted: boolean): void {
    if (!this.held) return;
    this.held.setMicrophoneMuted(muted);
    this.store.change({ microphone: muted });
  }

  public setSpeakerMuted(muted: boolean): void {
    if (!this.held) return;
    this.held.setSpeakerMuted(muted);
    this.store.change({ speaker: muted });
  }

  public async chooseDevices(choice: VoiceDeviceChoice): Promise<void> {
    const previous = this.devices;
    this.devices = choice;
    await this.held?.follow(previous, choice, this.environment);
  }

  public mutes = (): VoiceMutes => this.store.read();

  public subscribe = (listener: () => void): (() => void) =>
    this.store.subscribe(listener);

  public levels(): VoiceLevels {
    return this.held?.levels() ?? noLevels;
  }

  public spectrum(): VoiceSpectrum {
    if (this.held) this.held.spectrum(this.bands);
    else {
      this.bands.input.fill(0);
      this.bands.output.fill(0);
    }

    return this.bands;
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
