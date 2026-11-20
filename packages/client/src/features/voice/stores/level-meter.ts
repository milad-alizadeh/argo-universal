import { bandsOf, peakOf } from '../utils/analyser-bands';

const fftSize = 512;

/*
 * Reads how loud a stream is, from 0 to 1, from an AnalyserNode on its track: as the loudest frequency's strength, and
 * band by band across speech. The levels stay in the App: they only move the band.
 */
export class LevelMeter {
  private readonly context = new AudioContext();
  private readonly analyser = this.context.createAnalyser();
  private readonly bins: Uint8Array<ArrayBuffer>;

  public constructor(stream: MediaStream) {
    this.analyser.fftSize = fftSize;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.context.createMediaStreamSource(stream).connect(this.analyser);
  }

  public level(): number {
    this.analyser.getByteFrequencyData(this.bins);

    return peakOf(this.bins);
  }

  public spectrum(into: Float32Array): void {
    this.analyser.getByteFrequencyData(this.bins);
    bandsOf(this.bins, into, this.context.sampleRate / fftSize);
  }

  public close(): void {
    void this.context.close();
  }
}
