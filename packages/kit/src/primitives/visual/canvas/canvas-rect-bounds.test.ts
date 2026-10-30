import { describe, expect, it } from 'vitest';
import type { Matrix } from './canvas-matrix';
import type { CanvasDrawing, RectProps } from './canvas-props';
import { plainRectBounds } from './canvas-rect-bounds';

const identity: Matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const quarterTurn: Matrix = [0, -1, 0, 1, 0, 0, 0, 0, 1];

const tile = (props: Partial<RectProps> = {}): CanvasDrawing => ({
  kind: 'rect',
  key: 'tile',
  props: { tone: 'neutral', x: 10, y: 20, width: 30, height: 40, ...props },
});

describe('plainRectBounds', () => {
  it('reads a plain tile straight off its rectangle', () => {
    expect(plainRectBounds(tile(), identity)).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 40,
    });
  });

  it('moves and scales with its group', () => {
    const matrix: Matrix = [2, 0, 5, 0, 3, 7, 0, 0, 1];

    expect(plainRectBounds(tile(), matrix)).toEqual({
      x: 25,
      y: 67,
      width: 60,
      height: 120,
    });
  });

  it('reads a flipped group from the smaller corner', () => {
    const matrix: Matrix = [-1, 0, 0, 0, 1, 0, 0, 0, 1];

    expect(plainRectBounds(tile(), matrix)).toEqual({
      x: -40,
      y: 20,
      width: 30,
      height: 40,
    });
  });

  it('keeps the path for a rounded, stroked, unfilled, turned or empty shape', () => {
    expect(plainRectBounds(tile({ rx: 2 }), identity)).toBeUndefined();
    expect(plainRectBounds(tile({ ry: 2 }), identity)).toBeUndefined();
    expect(plainRectBounds(tile({ stroke: true }), identity)).toBeUndefined();
    expect(plainRectBounds(tile({ fill: false }), identity)).toBeUndefined();
    expect(plainRectBounds(tile(), quarterTurn)).toBeUndefined();
    expect(plainRectBounds(tile({ width: 0 }), identity)).toBeUndefined();
  });

  it('keeps the path for a shape that is not a rectangle', () => {
    const circle: CanvasDrawing = {
      kind: 'circle',
      key: 'dot',
      props: { tone: 'neutral', cx: 0, cy: 0, r: 5 },
    };

    expect(plainRectBounds(circle, identity)).toBeUndefined();
  });

  it('takes a rectangle with no origin from zero', () => {
    const atZero: CanvasDrawing = {
      kind: 'rect',
      key: 'tile',
      props: { tone: 'neutral', width: 8, height: 4 },
    };

    expect(plainRectBounds(atZero, identity)).toEqual({
      x: 0,
      y: 0,
      width: 8,
      height: 4,
    });
  });
});
