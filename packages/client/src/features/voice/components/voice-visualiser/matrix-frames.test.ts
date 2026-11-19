import { describe, expect, it } from 'vitest';
import { drawMatrix, MatrixGrid, type MatrixMoment } from './matrix-frames';

// A wide grid, as ElevenLabs draws its matrix: more columns than rows.
const rows = 11;

const columns = 27;

const middleRow = 5;

const middleColumn = 13;

const drawn = (moment: Partial<MatrixMoment>): MatrixGrid => {
  const grid = new MatrixGrid(rows, columns);
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
  Array.from({ length: rows }, (_, row) => grid.at(row, index));

describe('the matrix while someone speaks', () => {
  it('rests on a dim middle row in silence, so the call still shows', () => {
    const quiet = drawn({ heard: new Float32Array(8) });

    for (let each = 0; each < columns; each++) {
      expect(quiet.at(middleRow, each)).toBeGreaterThan(0);
      expect(quiet.at(middleRow, each)).toBeLessThan(0.5);
    }

    expect(lit(quiet)).toBe(columns);
  });

  it('grows each column up and down from the middle row as loud as its band', () => {
    const loud = drawn({
      pattern: 'talking',
      heard: new Float32Array(8).fill(1),
    });

    expect(lit(loud)).toBe(rows * columns);
  });

  it('puts the low bands in the middle and mirrors them out to both edges', () => {
    const low = drawn({ heard: Float32Array.of(1, 0, 0, 0, 0, 0, 0, 0) });

    expect(column(low, middleColumn).filter((value) => value > 0)).toHaveLength(
      rows,
    );
    expect(column(low, 0)).toEqual(column(low, columns - 1));
    expect(column(low, 0).filter((value) => value > 0)).toHaveLength(1);
  });

  it('clears what the last frame lit', () => {
    const grid = new MatrixGrid(rows, columns);
    const loud = new Float32Array(8).fill(1);
    drawMatrix(grid, { pattern: 'talking', heard: loud, time: 0 });
    drawMatrix(grid, { pattern: 'talking', heard: undefined, time: 0 });

    expect(lit(grid)).toBe(columns);
  });
});

describe('the matrix while nobody speaks', () => {
  it('turns a ring of dots in the middle of the grid while connecting', () => {
    const now = drawn({ pattern: 'connecting' });
    const later = drawn({ pattern: 'connecting', time: 0.25 });

    expect(lit(now)).toBeGreaterThan(4);
    expect(now.at(middleRow, middleColumn)).toBe(0);
    expect(column(now, 0).every((value) => value === 0)).toBe(true);
    expect(column(now, columns - 1).every((value) => value === 0)).toBe(true);
    expect([...later.dots]).not.toEqual([...now.dots]);
  });

  it('runs one slow wave across the columns while thinking, ignoring any sound', () => {
    const wave = drawn({
      pattern: 'thinking',
      heard: new Float32Array(8).fill(1),
    });

    for (let each = 0; each < columns; each++)
      expect(Math.max(...column(wave, each))).toBe(1);

    expect(lit(wave)).toBeLessThan(columns * 3 + 1);
  });
});
