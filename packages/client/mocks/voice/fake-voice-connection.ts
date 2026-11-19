import type {
  VoiceConnection,
  VoiceLevels,
  VoiceMutes,
} from '../../src/features/voice/voice-connection';
import { VoiceMuteStore } from '../../src/features/voice/voice-mute-store';

/*
 * A Voice connection that carries no audio, for tests and stories: it holds its mutes as the real one does, records
 * every mute it was asked for, and reports the levels a test sets.
 */
export class FakeVoiceConnection implements VoiceConnection {
  public closed = false;
  public input = 0;
  public output = 0;
  // Every mute the connection was asked for, in order, such as `microphone:true`.
  public readonly asked: string[] = [];
  private readonly store = new VoiceMuteStore();

  public constructor(private readonly offer = Promise.resolve('v=0 offer')) {}

  public createOffer(): Promise<string> {
    this.store.reset();

    return this.offer;
  }

  public accept(): Promise<void> {
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

  public mutes = (): VoiceMutes => this.store.read();

  public subscribe = (listener: () => void): (() => void) =>
    this.store.subscribe(listener);

  public levels(): VoiceLevels {
    return { input: this.input, output: this.output };
  }

  public async preview(
    answerFor: (offer: string) => Promise<string>,
  ): Promise<void> {
    await answerFor('v=0 listening offer');
  }

  public endPreview(): void {}

  public close(): void {
    this.closed = true;
    this.store.reset();
  }
}
