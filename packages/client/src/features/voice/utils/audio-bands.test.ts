import { describe, expect, it } from 'vitest';
import { bandsOf, levelOf } from './audio-bands';

// What an AnalyserNode with an fftSize of 256 hands `getByteFrequencyData`: 128 bins, each from 0 to 255.
const binCount = 128;

const analysed = (strength: (bin: number) => number): Uint8Array =>
  Uint8Array.from({ length: binCount }, (_, bin) => strength(bin));

const bandsFrom = (bins: Uint8Array, count = 8): number[] => {
  const into = new Float32Array(count);
  bandsOf(bins, into);

  return [...into];
};

describe('how loud a stream is', () => {
  it('reads the loudest frequency, from 0 to 1', () => {
    expect(levelOf(analysed(() => 0))).toBe(0);
    expect(levelOf(analysed((bin) => (bin === 30 ? 255 : 10)))).toBe(1);
    expect(levelOf(analysed(() => 51))).toBeCloseTo(0.2);
  });
});

describe('how loud each band of speech is', () => {
  it('reads silence as every band at zero, and a full stream as every band at one', () => {
    expect(bandsFrom(analysed(() => 0))).toEqual(Array(8).fill(0));
    expect(bandsFrom(analysed(() => 255))).toEqual(Array(8).fill(1));
  });

  it('reads only the bins speech sits in, so a hum or a hiss lights no band', () => {
    const hum = analysed((bin) => (bin < 6 ? 255 : 0));
    const hiss = analysed((bin) => (bin >= 51 ? 255 : 0));

    expect(bandsFrom(hum)).toEqual(Array(8).fill(0));
    expect(bandsFrom(hiss)).toEqual(Array(8).fill(0));
  });

  it('orders the bands from low to high', () => {
    const low = bandsFrom(analysed((bin) => (bin >= 6 && bin < 11 ? 255 : 0)));

    expect(low[0]).toBe(1);
    expect(low.slice(2)).toEqual(Array(6).fill(0));
  });

  it('averages the bins a band covers', () => {
    const half = bandsFrom(
      analysed((bin) => (bin % 2 === 0 ? 255 : 0)),
      4,
    );

    for (const band of half) expect(band).toBeCloseTo(0.5, 1);
  });

  it('fills however many bands it is given', () => {
    expect(
      bandsFrom(
        analysed(() => 255),
        24,
      ),
    ).toHaveLength(24);
  });
});
