import type { Microphone } from '../types/voice-environment';
import { LevelMeter } from './level-meter';

// The microphone's sound through a gain node, for a gain other than 1.
class GainedStream {
  private readonly context = new AudioContext();
  private readonly node = this.context.createGain();
  public readonly stream: MediaStream;

  public constructor(raw: MediaStream) {
    const destination = this.context.createMediaStreamDestination();
    this.context.createMediaStreamSource(raw).connect(this.node);
    this.node.connect(destination);
    this.stream = destination.stream;
    void this.context.resume();
  }

  public set(gain: number): void {
    this.node.gain.value = gain;
  }

  public close(): void {
    for (const track of this.stream.getTracks()) track.stop();
    void this.context.close();
  }
}

/*
 * The page's microphone. At a gain of 1 it sends the browser's own track untouched; any other gain sends it through
 * a gain node, so the sound reaches the peer raised or lowered after the browser's echo cancellation.
 */
export class BrowserMicrophone implements Microphone {
  private readonly meter: LevelMeter;
  private muted = false;
  private gained: GainedStream | undefined;

  public constructor(private readonly raw: MediaStream) {
    this.meter = new LevelMeter(raw);
  }

  // What the peer sends up.
  public get stream(): MediaStream {
    return this.gained?.stream ?? this.raw;
  }

  public setGain(gain: number): void {
    if (gain === 1) return this.ungain();
    this.gained ??= new GainedStream(this.raw);
    this.gained.set(gain);
  }

  private ungain(): void {
    this.gained?.close();
    this.gained = undefined;
  }

  public stop(): void {
    this.meter.close();
    this.ungain();

    for (const track of this.raw.getTracks()) track.stop();
  }

  // A muted track sends silence, so the call stays up; the gain node then sends silence too.
  public setMuted(muted: boolean): void {
    this.muted = muted;

    for (const track of this.raw.getAudioTracks()) track.enabled = !muted;
  }

  public level(): number {
    return this.muted ? 0 : this.meter.level();
  }

  public spectrum(into: Float32Array): void {
    if (this.muted) into.fill(0);
    else this.meter.spectrum(into);
  }
}
