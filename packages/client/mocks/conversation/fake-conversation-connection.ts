import type { VoicePreviewClip } from '@repo/contracts';
import type { ConversationDeviceChoice } from '../../src/features/conversation/stores/conversation-device-choice';
import { ConversationMuteStore } from '../../src/features/conversation/stores/conversation-mute-store';
import {
  silentSpectrum,
  type ConversationConnection,
  type VoiceLevels,
  type ConversationMutes,
  type VoiceSound,
  type VoiceSpectrum,
} from '../../src/features/conversation/types/conversation-connection';

/*
 * A Conversation connection that carries no audio, for tests and stories: it holds its mutes as the real one does, records
 * every mute it was asked for, and reports the levels a test sets.
 */
export class FakeConversationConnection implements ConversationConnection {
  public closed = false;
  public input = 0;
  public output = 0;
  // Every mute the connection was asked for, in order, such as `microphone:true`.
  public readonly asked: string[] = [];
  // Every answer the connection was completed with, in order.
  public readonly accepted: string[] = [];
  private readonly store = new ConversationMuteStore();

  public constructor(private readonly offer = Promise.resolve('v=0 offer')) {}

  public createOffer(): Promise<string> {
    this.store.reset();

    return this.offer;
  }

  public accept(answer: string): Promise<void> {
    this.accepted.push(answer);

    return Promise.resolve();
  }

  public setMicrophoneMuted(muted: boolean): void {
    this.asked.push(`microphone:${muted}`);
    this.store.change({ microphone: muted });
  }

  public setSpeakerMuted(muted: boolean): void {
    this.asked.push(`speaker:${muted}`);
    this.store.change({ speaker: muted });
  }

  public chooseDevices(choice: ConversationDeviceChoice): Promise<void> {
    this.asked.push(`devices:${choice.microphone}:${choice.speaker}`);

    return Promise.resolve();
  }

  public setSound(sound: VoiceSound): void {
    this.asked.push(`sound:${sound.volume}:${sound.microphoneGain}`);
  }

  public mutes = (): ConversationMutes => this.store.read();

  public subscribe = (listener: () => void): (() => void) =>
    this.store.subscribe(listener);

  public levels(): VoiceLevels {
    return { input: this.input, output: this.output };
  }

  // Every band as loud as the level a test sets.
  public spectrum(): VoiceSpectrum {
    const spectrum = silentSpectrum();
    spectrum.input.fill(this.input);
    spectrum.output.fill(this.output);

    return spectrum;
  }

  public async preview(
    answerFor: (offer: string) => Promise<string>,
  ): Promise<void> {
    await answerFor('v=0 listening offer');
  }

  // Every stored greeting played, oldest first.
  public readonly clips: VoicePreviewClip[] = [];

  public playClip(clip: VoicePreviewClip): void {
    this.clips.push(clip);
  }

  public endPreview(): void {}

  public close(): void {
    this.closed = true;
    this.store.reset();
  }
}
