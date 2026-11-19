import { describe, expect, it } from 'vitest';
import { drawMatrix, MatrixGrid, type MatrixMoment } from './matrix-frames';

const size = 11;

const centre = 5;

const drawn = (moment: Partial<MatrixMoment>): MatrixGrid => {
  const grid = new MatrixGrid(size);
  drawMatrix(grid, {
    pattern: 'listening',
    heard: undefined,
    time: 0,
    ...moment,
  });

  return grid;
};

const lit = (grid: MatrixGrid): number =>
  grid.dots.filter((value) => value > 0).length;

const column = (grid: MatrixGrid, index: number): number[] =>
  Array.from({ length: size }, (_, row) => grid.at(row, index));

describe('the matrix while someone speaks', () => {
  it('rests on a dim middle row in silence, so the call still shows', () => {
    const quiet = drawn({ heard: new Float32Array(8) });

    for (let each = 0; each < size; each++) {
      expect(quiet.at(centre, each)).toBeGreaterThan(0);
      expect(quiet.at(centre, each)).toBeLessThan(0.5);
    }

    expect(lit(quiet)).toBe(size);
  });

  it('grows each column up and down from the middle row as loud as its band', () => {
    const loud = drawn({
      pattern: 'talking',
      heard: new Float32Array(8).fill(1),
    });

    expect(lit(loud)).toBe(size * size);
  });

  it('puts the low bands in the middle and mirrors them out to both edges', () => {
    const low = drawn({ heard: Float32Array.of(1, 0, 0, 0, 0, 0, 0, 0) });

    expect(column(low, centre).filter((value) => value > 0)).toHaveLength(size);
    expect(column(low, 0)).toEqual(column(low, size - 1));
    expect(column(low, 0).filter((value) => value > 0)).toHaveLength(1);
  });

  it('clears what the last frame lit', () => {
    const grid = new MatrixGrid(size);
    const loud = new Float32Array(8).fill(1);
    drawMatrix(grid, { pattern: 'talking', heard: loud, time: 0 });
    drawMatrix(grid, { pattern: 'talking', heard: undefined, time: 0 });

    expect(lit(grid)).toBe(size);
  });
});

describe('the matrix while nobody speaks', () => {
  it('turns a ring of dots while connecting', () => {
    const now = drawn({ pattern: 'connecting' });
    const later = drawn({ pattern: 'connecting', time: 0.25 });

    expect(lit(now)).toBeGreaterThan(4);
    expect(now.at(centre, centre)).toBe(0);
    expect([...later.dots]).not.toEqual([...now.dots]);
  });

  it('runs one slow wave across the columns while thinking, ignoring any sound', () => {
    const wave = drawn({
      pattern: 'thinking',
      heard: new Float32Array(8).fill(1),
    });

    for (let each = 0; each < size; each++)
      expect(Math.max(...column(wave, each))).toBe(1);

    expect(lit(wave)).toBeLessThan(size * 3 + 1);
  });
});
