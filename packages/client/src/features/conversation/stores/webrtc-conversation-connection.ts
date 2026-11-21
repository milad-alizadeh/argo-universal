import type { VoicePreviewClip } from '@repo/contracts';
import {
  silentSpectrum,
  type ConversationConnection,
  type VoiceLevels,
  type ConversationMutes,
  type VoiceSound,
  type VoiceSpectrum,
} from '../types/conversation-connection';
import type {
  Microphone,
  ConversationEnvironment,
} from '../types/conversation-environment';
import { ConnectionPreview } from './connection-preview';
import {
  systemDevices,
  type ConversationDeviceChoice,
} from './conversation-device-choice';
import { ConversationMuteStore } from './conversation-mute-store';
import {
  HeldConversation,
  openChosen,
  type HeldSound,
} from './held-conversation';
import { latencyProbe } from './latency-probe';

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
class WebRtcConversationConnection implements ConversationConnection {
  private held: HeldConversation | undefined;
  private readonly previews = new ConnectionPreview();
  // The microphone and speaker this Device chose; every call starts on them.
  private devices = systemDevices;
  // The volume and gain the person chose; every call starts with them.
  private sound: HeldSound = { volume: 1, gain: 1 };
  private readonly store = new ConversationMuteStore();
  // Refilled on every read, so the band reading each frame makes no garbage.
  private readonly bands = silentSpectrum();

  public constructor(private readonly environment: ConversationEnvironment) {}

  public async createOffer(): Promise<string> {
    this.close();
    this.endPreview();
    // SPIKE (latency on a phone): the call's clock starts here, as near the tap as the connection gets.
    latencyProbe.begin();

    const microphone = await openChosen(
      this.environment,
      this.devices.microphone,
    );

    latencyProbe.mark('microphone');
    const held = this.hold(microphone);
    this.held = held;
    const offer = await held.peer.offer(microphone);
    latencyProbe.mark('offer');
    latencyProbe.watch(held.peer);

    return offer;
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
  ): ((voice: MediaStream, held: HeldConversation) => void) | undefined {
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
    heard?: (voice: MediaStream, held: HeldConversation) => void,
  ): HeldConversation {
    const held = new HeldConversation(
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
    latencyProbe.mark('answer');
    await this.held?.peer.accept(answer);
    latencyProbe.mark('accepted');
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

  public async chooseDevices(choice: ConversationDeviceChoice): Promise<void> {
    const previous = this.devices;
    this.devices = choice;
    await this.held?.follow(previous, choice, this.environment);
  }

  public setSound(sound: VoiceSound): void {
    this.sound = heldSoundOf(sound);
    void this.held?.setSound(this.sound);
    this.previews.setSound(this.sound);
  }

  public mutes = (): ConversationMutes => this.store.read();

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
    latencyProbe.stop();
    held?.release();
  }
}

export const createWebRtcConversationConnection = (
  environment: ConversationEnvironment,
): ConversationConnection => new WebRtcConversationConnection(environment);
