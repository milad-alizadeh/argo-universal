/*
 * The LED matrix's frames, ported from ElevenLabs UI's Matrix (`matrix.tsx`: `vu`, `loader` and `wave`).
 *
 * MIT License, Copyright (c) 2025 Eleven Labs Inc. Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, subject to the conditions that the above copyright notice and this permission notice be
 * included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY
 * OF ANY KIND. https://github.com/elevenlabs/ui
 *
 * Argo's changes: a square grid of any size written into one reused buffer rather than a new array per frame, a `vu`
 * that grows from the middle row and mirrors the bands out from the middle column, and frames read from a clock
 * rather than stepped through by React state.
 */
import type { VisualiserPattern } from './visualiser-pattern';

const turn = Math.PI * 2;

const half = 0.5;

// A square of dots, each a brightness from 0 to 1, row by row; one buffer, refilled each frame.
export class MatrixGrid {
  public readonly dots: Float32Array;
  // The middle row's and the middle column's index.
  public readonly middle: number;

  public constructor(public readonly size: number) {
    this.dots = new Float32Array(size * size);
    this.middle = (size - 1) / 2;
  }

  public at(row: number, column: number): number {
    return this.dots[row * this.size + column] ?? 0;
  }

  public set(row: number, column: number, value: number): void {
    if (this.holds(row) && this.holds(column))
      this.dots[row * this.size + column] = value;
  }

  private holds(index: number): boolean {
    return index >= 0 && index < this.size;
  }
}

// What the matrix shows at one moment: the pattern, the sound it draws, if any, and the clock in seconds.
export interface MatrixMoment {
  pattern: VisualiserPattern;
  heard: ArrayLike<number> | undefined;
  time: number;
}

// A silent column still shows its middle dot, dimly, so the matrix never goes dark mid-call.
const quietDot = 0.3;

// ElevenLabs' `vu` lights a bar's top 30% fully, the next 30% at 0.8 and the rest at 0.6.
const vuSteps = [
  { from: 0.7, brightness: 1 },
  { from: 0.4, brightness: 0.8 },
  { from: 0, brightness: 0.6 },
] as const;

// Mirrored, a bar's top is the dots furthest from the middle row.
const vuBrightness = (reach: number): number =>
  vuSteps.find((step) => reach >= step.from)?.brightness ?? quietDot;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

// The band a column shows: the lowest in the middle column, the highest at both edges.
function bandFor(
  levels: ArrayLike<number>,
  column: number,
  middle: number,
): number {
  const distance = Math.abs(column - middle) / middle;

  const index = Math.min(
    levels.length - 1,
    Math.floor(distance * levels.length),
  );

  return clamp(levels[index] ?? 0);
}

function vuColumn(grid: MatrixGrid, column: number, level: number): void {
  const { middle } = grid;
  const reach = Math.min(middle, Math.floor(level * (middle + 1)));

  if (level * (middle + 1) < 1) return grid.set(middle, column, quietDot);

  for (let distance = 0; distance <= reach; distance++) {
    const brightness = vuBrightness(distance / middle);
    grid.set(middle - distance, column, brightness);
    grid.set(middle + distance, column, brightness);
  }
}

function vu(grid: MatrixGrid, levels: ArrayLike<number>): void {
  for (let column = 0; column < grid.size; column++)
    vuColumn(grid, column, bandFor(levels, column, grid.middle));
}

// ElevenLabs' loader steps 12 frames a turn at 12 frames a second.
const loaderSteps = 12;

const loaderDots = 12;

const faintestTail = 0.2;

// How much longer than the ring the tail's fade runs, so its last dot still shows.
const tailFade = 1.2;

// The ring's head is brightest and each dot behind it dimmer, down to a faint tail.
const tailBrightness = (dot: number): number =>
  Math.max(faintestTail, 1 - dot / (loaderDots * tailFade));

// A ring of dots with a fading tail, turning once a second.
function loader(grid: MatrixGrid, time: number): void {
  const { middle } = grid;
  const radius = middle - half;
  const step = Math.floor(time * loaderSteps) % loaderSteps;

  for (let dot = 0; dot < loaderDots; dot++) {
    const angle = (step / loaderSteps + dot / loaderDots) * turn;

    grid.set(
      Math.round(middle + Math.sin(angle) * radius),
      Math.round(middle + Math.cos(angle) * radius),
      tailBrightness(dot),
    );
  }
}

// One slow pass of the wave across the columns, in seconds: calm, while the Agent works.
const wavePeriod = 3;

// Where a column's wave sits, in rows from the top: one row in from either edge at its peaks.
function waveHeight(grid: MatrixGrid, column: number, time: number): number {
  const phase = (time / wavePeriod + column / grid.size) * turn;

  return Math.sin(phase) * (grid.middle - half) + grid.middle + half;
}

// A sine wave rolling across the columns, its dot shared with the rows either side by how far between them it falls.
function wave(grid: MatrixGrid, time: number): void {
  for (let column = 0; column < grid.size; column++) {
    const height = waveHeight(grid, column, time);
    const row = Math.floor(height);
    const fraction = height - row;

    grid.set(row, column, 1);
    grid.set(row - 1, column, 1 - fraction);
    grid.set(row + 1, column, fraction);
  }
}

const silence = new Float32Array(1);

const drawings: Record<
  VisualiserPattern,
  (grid: MatrixGrid, moment: MatrixMoment) => void
> = {
  connecting: (grid, { time }) => loader(grid, time),
  thinking: (grid, { time }) => wave(grid, time),
  listening: (grid, { heard }) => vu(grid, heard ?? silence),
  talking: (grid, { heard }) => vu(grid, heard ?? silence),
};

/*
 * Fills the grid with what a pattern shows at this moment: the sound's bands while someone speaks, the turning ring
 * while connecting and the slow wave while thinking.
 */
export function drawMatrix(grid: MatrixGrid, moment: MatrixMoment): void {
  grid.dots.fill(0);
  drawings[moment.pattern](grid, moment);
}
