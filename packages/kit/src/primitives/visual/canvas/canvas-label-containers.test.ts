import { describe, expect, it } from 'vitest';
import { assignLabelContainers } from './canvas-label-containers';
import type { Matrix } from './canvas-matrix';
import type { CanvasDrawing } from './canvas-props';
import type { SceneEntry } from './canvas-scene-types';

const identity: Matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const empty = { x: 0, y: 0, width: 0, height: 0 };

function entryOf(drawing: CanvasDrawing, matrix: Matrix): SceneEntry {
  return {
    key: drawing.key,
    address: drawing.key,
    drawing,
    bounds: empty,
    matrix,
  };
}

function rect(
  key: string,
  bounds: { x: number; y: number; width: number; height: number },
  matrix: Matrix = identity,
): SceneEntry {
  const drawing: CanvasDrawing = {
    kind: 'rect',
    key,
    props: { tone: 'neutral', ...bounds },
  };

  return entryOf(drawing, matrix);
}

function text(
  key: string,
  at: { x: number; y: number },
  matrix: Matrix = identity,
): SceneEntry {
  const drawing: CanvasDrawing = {
    kind: 'text',
    key,
    props: { tone: 'neutral', ...at, text: key },
  };

  return entryOf(drawing, matrix);
}

const unbounded = Number.MAX_SAFE_INTEGER;

describe('assignLabelContainers', () => {
  it('gives a text the rectangle it sits in', () => {
    const tile = rect('tile', { x: 10, y: 20, width: 100, height: 40 });
    const caption = text('caption', { x: 14, y: 24 });
    const entries = [tile, caption];

    assignLabelContainers(entries);

    expect(caption.container).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 40,
    });
  });

  it('gives a text the last rectangle holding it, so a tile beats its folder', () => {
    const folder = rect('folder', { x: 0, y: 0, width: 200, height: 200 });
    const tile = rect('tile', { x: 10, y: 10, width: 30, height: 30 });
    const caption = text('caption', { x: 12, y: 12 });

    assignLabelContainers([folder, tile, caption]);

    expect(caption.container).toEqual({ x: 10, y: 10, width: 30, height: 30 });
  });

  it('leaves a text outside every rectangle unbounded', () => {
    const tile = rect('tile', { x: 0, y: 0, width: 10, height: 10 });
    const caption = text('caption', { x: 50, y: 50 });

    assignLabelContainers([tile, caption]);

    expect(caption.container).toEqual({
      x: 50,
      y: 50,
      width: unbounded,
      height: unbounded,
    });
  });

  it('ignores a rectangle from another group, whose matrix differs', () => {
    const turn: Matrix = [0, -1, 0, 1, 0, 0, 0, 0, 1];

    const turned = rect(
      'turned',
      { x: 0, y: 0, width: 100, height: 100 },
      turn,
    );

    const caption = text('caption', { x: 10, y: 10 });

    assignLabelContainers([turned, caption]);

    expect(caption.container?.width).toBe(unbounded);
  });

  it('leaves shapes that are not text without a container', () => {
    const tile = rect('tile', { x: 0, y: 0, width: 10, height: 10 });

    assignLabelContainers([tile]);

    expect(tile.container).toBeUndefined();
  });
});
