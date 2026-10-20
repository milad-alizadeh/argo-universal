import { describe, expect, it } from 'vitest';
import type { Bounds, Tile } from '../model';
import { runCamera, type ScreenPoint, zoomLimits } from '../viewport/viewport';
import {
  createFlatViewport,
  type FlatViewport,
  flatFitMargin,
} from './flat-viewport';

const extent: Bounds = { x: 0, y: 0, w: 100, h: 80 };

const size = { width: 1150, height: 1000 };

// Fit scales the extent plus its margins into the viewport and centres it.
const fitScale = Math.min(
  size.width / (extent.w * flatFitMargin.x),
  size.height / (extent.h * flatFitMargin.y),
);

const fitOrigin = {
  x: (size.width - extent.w * fitScale) / 2,
  y: (size.height - extent.h * fitScale) / 2,
};

function tile(id: string, bounds: Bounds): Tile {
  const file = { id, path: id, area: 1, height: 1, branches: 0, tone: 'none' };

  return { ...file, ...bounds, elevation: 1 };
}

const tiles = [
  tile('src/a.ts', { x: 10, y: 10, w: 20, h: 10 }),
  tile('src/b.ts', { x: 60, y: 40, w: 30, h: 30 }),
];

function viewport(): FlatViewport {
  return createFlatViewport({ tiles, extent }, size);
}

describe('flat viewport', () => {
  it('starts with the extent centred and fitted to the viewport', () => {
    const flat = viewport();

    expect(flat.toScreen({ x: 0, y: 0 })).toEqual({
      x: fitOrigin.x,
      y: fitOrigin.y,
    });
    expect(flat.toScreen({ x: 100, y: 80 })).toEqual({
      x: fitOrigin.x + extent.w * fitScale,
      y: fitOrigin.y + extent.h * fitScale,
    });
  });

  it('returns to fit after the camera moved', () => {
    const flat = viewport();
    flat.pan({ x: 40, y: -30 });
    runCamera(flat, 'in');
    runCamera(flat, 'fit');

    expect(flat.toScreen({ x: 0, y: 0 })).toEqual({
      x: fitOrigin.x,
      y: fitOrigin.y,
    });
  });

  const poses: [string, (flat: FlatViewport) => void][] = [
    ['at fit', (flat) => runCamera(flat, 'fit')],
    ['after a pan', (flat) => flat.pan({ x: 37, y: -12 })],
    ['after zooming in', (flat) => runCamera(flat, 'in')],
    ['after zooming out', (flat) => runCamera(flat, 'out')],
  ];

  it.each(poses)('picks each tile at its screen centre %s', (_, move) => {
    const flat = viewport();
    move(flat);

    for (const { id, x, y, w, h } of tiles) {
      const centre = midpoint(
        flat.toScreen({ x, y }),
        flat.toScreen({ x: x + w, y: y + h }),
      );

      expect(flat.pick(centre)).toBe(id);
    }
  });

  it('picks nothing on empty map space', () => {
    expect(viewport().pick({ x: 1100, y: 50 })).toBeUndefined();
  });

  it.each([
    ['in', zoomLimits.max],
    ['out', zoomLimits.min],
  ] as const)(
    'clamps repeated zoom %s buttons to the zoom limit %d',
    (action, limit) => {
      const flat = viewport();

      for (let press = 0; press < 30; press += 1) runCamera(flat, action);

      expect(unitWidth(flat)).toBeCloseTo(fitScale * limit);
    },
  );
});

function midpoint(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function unitWidth(flat: FlatViewport): number {
  return flat.toScreen({ x: 1, y: 0 }).x - flat.toScreen({ x: 0, y: 0 }).x;
}
