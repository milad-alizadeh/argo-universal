const fftSize = 256;

const loudest = 255;

// Reads how loud a stream is, from 0 to 1, as the loudest frequency's strength. The levels stay in the App: they only move the orb.
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

    return Math.max(...this.bins) / loudest;
  }

  public close(): void {
    void this.context.close();
  }
}
