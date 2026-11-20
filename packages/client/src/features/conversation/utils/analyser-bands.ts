/*
 * Reads an AnalyserNode's byte frequency data (`getByteFrequencyData`, each bin from 0 to 255, bin `i` at `i * binHz`)
 * as levels from 0 to 1. Argo's own: speech is read between two fixed pitches, in bands as wide as an ear hears them,
 * so each octave of speech gets the same share of the band.
 */

const loudest = 255;

// Below this is rumble and above it hiss; speech's body sits between.
const speechFromHz = 120;

const speechToHz = 4000;

// How loud a stream is: the strength of its loudest frequency.
export function peakOf(bins: Iterable<number>): number {
  let peak = 0;

  for (const bin of bins) peak = Math.max(peak, bin);

  return peak / loudest;
}

const edgeOf = (band: number, count: number): number =>
  speechFromHz * (speechToHz / speechFromHz) ** (band / count);

interface Range {
  from: number;
  to: number;
}

// The strongest bin whose frequency falls in the range; the first bin above it when it holds none.
function strengthOf(
  bins: ArrayLike<number>,
  range: Range,
  binHz: number,
): number {
  const first = Math.ceil(range.from / binHz);
  const last = Math.max(first, Math.ceil(range.to / binHz) - 1);
  let strongest = 0;

  for (let bin = first; bin <= last; bin++) {
    strongest = Math.max(strongest, bins[bin] ?? 0);
  }

  return strongest / loudest;
}

// How loud each band of speech is, low to high, written into `into`: one band per entry.
export function bandsOf(
  bins: ArrayLike<number>,
  into: Float32Array,
  binHz: number,
): void {
  for (let band = 0; band < into.length; band++) {
    const range = {
      from: edgeOf(band, into.length),
      to: edgeOf(band + 1, into.length),
    };

    into[band] = strengthOf(bins, range, binHz);
  }
}
