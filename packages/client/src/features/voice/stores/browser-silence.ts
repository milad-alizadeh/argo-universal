import type { Microphone } from '../types/voice-environment';

// Silence to send up in place of the microphone, for a connection that only listens: the service will not speak to a connection that sends no sound (live probe, 2026-11-19).
export class BrowserSilence implements Microphone {
  private readonly context = new AudioContext();
  public readonly stream: MediaStream;

  public constructor() {
    const destination = this.context.createMediaStreamDestination();
    const source = this.context.createConstantSource();
    source.offset.value = 0;
    source.connect(destination);
    source.start();
    this.stream = destination.stream;
  }

  public stop(): void {
    for (const track of this.stream.getTracks()) track.stop();
    void this.context.close();
  }

  public setMuted(): void {}

  public setGain(): void {}

  public level(): number {
    return 0;
  }

  // Silence has no sound in any band.
  public spectrum(into: Float32Array): void {
    into.fill(0);
  }
}
