/*
 * Reads an AnalyserNode's byte frequency data (`getByteFrequencyData`, each bin from 0 to 255) as levels from 0 to 1.
 * The speech band is the slice ElevenLabs UI's LiveWaveform reads (MIT, Copyright (c) 2025 Eleven Labs Inc.).
 */

const loudest = 255;

// Below this is hum and above it hiss, as a share of the analyser's bins.
const speechFrom = 0.05;

const speechTo = 0.4;

// How loud a stream is: the strength of its loudest frequency.
export function levelOf(bins: Iterable<number>): number {
  let peak = 0;

  for (const bin of bins) peak = Math.max(peak, bin);

  return peak / loudest;
}

function averageOf(bins: ArrayLike<number>, from: number, to: number): number {
  let sum = 0;

  for (let bin = from; bin < to; bin++) sum += bins[bin] ?? 0;

  return sum / (to - from) / loudest;
}

// How loud each band of speech is, low to high, written into `into`: one band per entry, each the average of its bins.
export function bandsOf(bins: ArrayLike<number>, into: Float32Array): void {
  const start = Math.floor(bins.length * speechFrom);
  const end = Math.max(start + 1, Math.floor(bins.length * speechTo));
  const width = (end - start) / into.length;

  for (let band = 0; band < into.length; band++) {
    const from = start + Math.floor(band * width);
    const to = Math.max(from + 1, start + Math.floor((band + 1) * width));
    into[band] = averageOf(bins, from, to);
  }
}
