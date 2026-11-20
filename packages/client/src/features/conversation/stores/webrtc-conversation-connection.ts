import type { VoicePreviewClip } from '@repo/contracts';
import {
  silentSpectrum,
  type VoiceConnection,
  type VoiceLevels,
  type VoiceMutes,
  type VoiceSound,
  type VoiceSpectrum,
} from '../types/conversation-connection';
import type { Microphone, VoiceEnvironment } from '../types/conversation-environment';
import { ConnectionPreview } from './connection-preview';
import { HeldCall, openChosen, type HeldSound } from './held-conversation';
import { systemDevices, type VoiceDeviceChoice } from './conversation-device-choice';
import { VoiceMuteStore } from './conversation-mute-store';

const noLevels: VoiceLevels = { input: 0, output: 0 };

const percent = 100;

const heldSoundOf = ({ volume, microphoneGain }: VoiceSound): HeldSound => ({
  volume: volume / percent,
  gain: microphoneGain / percent,
});

/*
 * The App's side of a call on a browser or Electron page: the microphone goes up and the voice comes down.
 * A call is never recorded or stored; only a preview's greeting may be, for the Server to keep (ADR-0064).
 */
class WebRtcVoiceConnection implements VoiceConnection {
  private held: HeldCall | undefined;
  private readonly previews = new ConnectionPreview();
  // The microphone and speaker this Device chose; every call starts on them.
  private devices = systemDevices;
  // The volume and gain the person chose; every call starts with them.
  private sound: HeldSound = { volume: 1, gain: 1 };
  private readonly store = new VoiceMuteStore();
  // Refilled on every read, so the band reading each frame makes no garbage.
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
    onRecorded?: (clip: VoicePreviewClip) => void,
  ): Promise<void> {
    const silence = this.environment.openSilence();
    const held = this.hold(silence, this.recorder(onRecorded));
    this.previews.adopt(held);

    try {
      await held.peer.accept(await answerFor(await held.peer.offer(silence)));
    } catch (error) {
      if (this.previews.isLive(held)) this.endPreview();
      throw error;
    }
  }

  // A stored greeting in place of any preview, on the chosen speaker at the chosen volume.
  public playClip(clip: VoicePreviewClip): void {
    const playback = this.environment.playClip(clip, this.devices.speaker);
    playback.setVolume(this.sound.volume);
    this.previews.play(playback);
  }

  public endPreview(): void {
    this.previews.end();
  }

  // Records a preview's voice as it arrives, where the page can record.
  private recorder(
    onRecorded?: (clip: VoicePreviewClip) => void,
  ): ((voice: MediaStream, held: HeldCall) => void) | undefined {
    if (!onRecorded) return undefined;

    return (voice, held) =>
      this.previews.record(
        held,
        this.environment.recordVoice(voice),
        onRecorded,
      );
  }

  // A connection holding what it sends up, playing the voice on the chosen speaker when it arrives.
  private hold(
    microphone: Microphone,
    heard?: (voice: MediaStream, held: HeldCall) => void,
  ): HeldCall {
    const held = new HeldCall(
      microphone,
      this.environment.createPeer(),
      this.sound,
    );

    held.peer.onVoice((voice) => {
      held.play(this.environment.playVoice(voice, this.devices.speaker));
      heard?.(voice, held);
    });

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
    this.previews.setSound(this.sound);
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
