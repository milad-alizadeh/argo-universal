import type {
  VoiceConnection,
  VoiceLevels,
} from '../../src/features/voice/voice-connection';

/*
 * A Voice connection that carries no audio, for tests and stories: it records what the call asked of the microphone and
 * the speaker, and reports the levels a test sets.
 */
export class FakeVoiceConnection implements VoiceConnection {
  public closed = false;
  public microphoneMuted = false;
  public speakerMuted = false;
  public input = 0;
  public output = 0;

  public constructor(private readonly offer = Promise.resolve('v=0 offer')) {}

  public createOffer(): Promise<string> {
    return this.offer;
  }

  public accept(): Promise<void> {
    return Promise.resolve();
  }

  public setMicrophoneMuted(muted: boolean): void {
    this.microphoneMuted = muted;
  }

  public setSpeakerMuted(muted: boolean): void {
    this.speakerMuted = muted;
  }

  public levels(): VoiceLevels {
    return { input: this.input, output: this.output };
  }

  public close(): void {
    this.closed = true;
  }
}
