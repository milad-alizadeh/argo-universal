import { PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { describe, expect, it, vi } from 'vitest';
import type { Bounds, Tile } from '../model';
import { runCamera } from '../viewport/viewport';
import { projectPoint, type CameraPose } from './three-projection';
import { createThreeViewport, type ThreeViewport } from './three-viewport';

// A 90° lens 10 units back from the origin: at that depth one unit is 5 px on a 100 px tall view.
const front: CameraPose = {
  position: { x: 0, y: 0, z: 10 },
  target: { x: 0, y: 0, z: 0 },
  fov: 90,
  size: { width: 200, height: 100 },
};

type Closeness = ReturnType<typeof expect.closeTo>;

function near(point: Record<string, number>): Record<string, Closeness> {
  return Object.fromEntries(
    Object.entries(point).map(([axis, value]) => [axis, expect.closeTo(value)]),
  );
}

describe('3D world to screen', () => {
  it.each([
    ['the target', { x: 0, y: 0 }, { x: 100, y: 50 }],
    ['ten units right of the target', { x: 10, y: 0 }, { x: 150, y: 50 }],
    [
      'five units above the target',
      { x: 0, y: 0, elevation: 5 },
      { x: 100, y: 25 },
    ],
  ])('projects %s through a plain camera pose', (_, point, screen) => {
    expect(projectPoint(front, point)).toEqual(near(screen));
  });

  it.each([
    ['the new target to the centre', { x: 10, y: 0 }, { x: 100, y: 50 }],
    ['the old target to the left', { x: 0, y: 0 }, { x: 50, y: 50 }],
  ])('moves %s when the pose moves', (_, point, screen) => {
    const shifted = {
      ...front,
      position: { x: 10, y: 0, z: 10 },
      target: { x: 10, y: 0, z: 0 },
    };

    expect(projectPoint(shifted, point)).toEqual(near(screen));
  });

  it('projects nothing behind the camera', () => {
    expect(projectPoint(front, { x: 0, y: 20 })).toBeUndefined();
  });
});

const extent: Bounds = { x: 0, y: 0, w: 100, h: 80 };

function tile(id: string, bounds: Bounds, elevation: number): Tile {
  const file = { id, path: id, area: 1, height: 1, branches: 0, tone: 'none' };

  return { ...file, ...bounds, elevation };
}

const tiles = [
  tile('src/a.ts', { x: 10, y: 10, w: 20, h: 10 }, 5),
  tile('src/b.ts', { x: 60, y: 40, w: 30, h: 30 }, 12),
];

function viewport(): ThreeViewport {
  const camera = new PerspectiveCamera(42, 1000 / 700, 0.1, 1000);

  const rig = {
    camera,
    controls: new OrbitControls(camera),
    invalidate: vi.fn<() => void>(),
  };

  const three = createThreeViewport({ tiles, extent }, rig);
  three.resize({ width: 1000, height: 700 });
  three.fit();

  return three;
}

function distance(three: ThreeViewport): number {
  const { position, target } = three.pose();

  return Math.hypot(
    position.x - target.x,
    position.y - target.y,
    position.z - target.z,
  );
}

describe('3D viewport', () => {
  it('fits by looking at the extent centre from the near corner', () => {
    const { position, target } = viewport().pose();

    expect(target).toEqual(near({ x: 50, y: 0, z: 40 }));
    expect(position).toEqual(near({ x: 145, y: 100, z: 155 }));
  });

  it.each(tiles)(
    'picks $id at the screen point of its roof centre',
    (picked) => {
      const three = viewport();

      const roof = three.toScreen({
        x: picked.x + picked.w / 2,
        y: picked.y + picked.h / 2,
        elevation: picked.elevation,
      });

      expect(roof && three.pick(roof)).toBe(picked.id);
    },
  );

  it('moves the extent centre with a pan by the screen delta', () => {
    const three = viewport();
    three.pan({ x: 30, y: -20 });

    expect(three.toScreen({ x: 50, y: 40 })).toEqual(near({ x: 530, y: 330 }));
  });

  it('picks nothing above the map', () => {
    expect(viewport().pick({ x: 500, y: 0 })).toBeUndefined();
  });

  // The fit camera is 179.58 units from its target: hypot(95, 100, 115).
  it.each([
    ['in', 14.965],
    ['out', 897.91],
  ] as const)(
    'clamps repeated zoom %s buttons to %f units from the target',
    (action, units) => {
      const three = viewport();

      for (let press = 0; press < 30; press += 1) runCamera(three, action);

      expect(distance(three)).toBeCloseTo(units, 2);
    },
  );
});
