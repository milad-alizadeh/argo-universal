import { HeldCall, openChosen, type HeldSound } from './held-call';
import {
  silentSpectrum,
  type VoiceConnection,
  type VoiceLevels,
  type VoiceMutes,
  type VoiceSound,
  type VoiceSpectrum,
} from './voice-connection';
import { systemDevices, type VoiceDeviceChoice } from './voice-device-choice';
import type { Microphone, VoiceEnvironment } from './voice-environment';
import { VoiceMuteStore } from './voice-mute-store';

const noLevels: VoiceLevels = { input: 0, output: 0 };

const percent = 100;

const heldSoundOf = ({ volume, microphoneGain }: VoiceSound): HeldSound => ({
  volume: volume / percent,
  gain: microphoneGain / percent,
});

// How long a preview may hold its connection; the Server hangs up sooner, once the greeting is said.
const previewLimitMs = 30_000;

/*
 * The App's side of a call on a browser or Electron page: the microphone goes up and the voice comes down.
 * Nothing is recorded or stored; audio only travels between the peer connection and the speaker.
 */
class WebRtcVoiceConnection implements VoiceConnection {
  private held: HeldCall | undefined;
  private previewing: HeldCall | undefined;
  private previewTimer: ReturnType<typeof setTimeout> | undefined;
  // The microphone and speaker this Device chose; every call starts on them.
  private devices = systemDevices;
  // The volume and gain the person chose; every call starts with them.
  private sound: HeldSound = { volume: 1, gain: 1 };
  private readonly store = new VoiceMuteStore();
  // Refilled on every read, so a visualiser reading each frame makes no garbage.
  private readonly bands = silentSpectrum();

  public constructor(private readonly environment: VoiceEnvironment) {}

  public async createOffer(): Promise<string> {
    this.close();
    this.endPreview();

    const microphone = await openChosen(
      this.environment,
      this.devices.microphone,
    );

    const held = this.hold(microphone);
    this.held = held;

    return held.peer.offer(microphone);
  }

  public async preview(
    answerFor: (offer: string) => Promise<string>,
  ): Promise<void> {
    const silence = this.environment.openSilence();
    const held = this.startPreview(silence);

    try {
      await held.peer.accept(await answerFor(await held.peer.offer(silence)));
    } catch (error) {
      if (this.previewing === held) this.endPreview();
      throw error;
    }
  }

  // A new preview in place of any earlier one, let go of after a while.
  private startPreview(silence: Microphone): HeldCall {
    this.endPreview();
    this.previewing = this.hold(silence);
    this.previewTimer = setTimeout(() => this.endPreview(), previewLimitMs);

    return this.previewing;
  }

  public endPreview(): void {
    const { previewing } = this;
    this.previewing = undefined;
    clearTimeout(this.previewTimer);
    previewing?.release();
  }

  // A connection holding what it sends up, playing the voice on the chosen speaker when it arrives.
  private hold(microphone: Microphone): HeldCall {
    const held = new HeldCall(
      microphone,
      this.environment.createPeer(),
      this.sound,
    );

    held.peer.onVoice((voice) =>
      held.play(this.environment.playVoice(voice, this.devices.speaker)),
    );

    return held;
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

  public setSound(sound: VoiceSound): void {
    this.sound = heldSoundOf(sound);
    void this.held?.setSound(this.sound);
    void this.previewing?.setSound(this.sound);
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
