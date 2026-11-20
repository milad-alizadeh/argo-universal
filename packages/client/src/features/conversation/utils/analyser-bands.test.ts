import { describe, expect, it } from 'vitest';
import { bandsOf, peakOf } from './analyser-bands';

// An AnalyserNode with an fftSize of 512 at 48 kHz hands `getByteFrequencyData` 256 bins, each 93.75 Hz apart.
const binHz = 93.75;

const binCount = 256;

const analysed = (strength: (frequency: number) => number): Uint8Array =>
  Uint8Array.from({ length: binCount }, (_, bin) => strength(bin * binHz));

const bandsFrom = (bins: Uint8Array, count = 8): number[] => {
  const into = new Float32Array(count);

  bandsOf(bins, into, binHz);

  return [...into];
};

describe('how loud a stream is', () => {
  it('reads the loudest frequency, from 0 to 1', () => {
    expect(peakOf(analysed(() => 0))).toBe(0);
    expect(peakOf(analysed((hz) => (hz === 1500 ? 255 : 10)))).toBe(1);
    expect(peakOf(analysed(() => 51))).toBeCloseTo(0.2);
  });
});

// How many of the eight bands light for a stream that is loud between two frequencies.
const litBetween = (from: number, to: number): number =>
  bandsFrom(
    analysed((hz) => (hz >= from && hz < to ? 255 : 0)),
    8,
  ).filter((band) => band > 0).length;

describe('how loud each band of speech is', () => {
  it('reads silence as every band at zero and a full stream as every band at one', () => {
    expect(bandsFrom(analysed(() => 0))).toEqual(Array(8).fill(0));
    expect(bandsFrom(analysed(() => 255))).toEqual(Array(8).fill(1));
  });

  it('reads only the frequencies speech sits in, so a rumble or a hiss lights no band', () => {
    const rumble = analysed((hz) => (hz < 100 ? 255 : 0));
    const hiss = analysed((hz) => (hz >= 5000 ? 255 : 0));

    expect(bandsFrom(rumble)).toEqual(Array(8).fill(0));
    expect(bandsFrom(hiss)).toEqual(Array(8).fill(0));
  });

  it('orders the bands from low to high', () => {
    const low = bandsFrom(analysed((hz) => (hz > 150 && hz < 350 ? 255 : 0)));

    const high = bandsFrom(
      analysed((hz) => (hz > 2500 && hz < 3500 ? 255 : 0)),
    );

    expect(low.findIndex((band) => band > 0)).toBeLessThan(
      high.findIndex((band) => band > 0),
    );
    expect(low.at(-1)).toBe(0);
    expect(high[0]).toBe(0);
  });

  it('spaces the bands by pitch, so a band is wider the higher it sits', () => {
    // The same 1 kHz of spectrum lights more of the lowest bands than of the highest.
    expect(litBetween(200, 1200)).toBeGreaterThan(litBetween(3000, 4000));
  });
});
