import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  defaultHeight,
  defaultWidth,
  readWindowState,
  saveWindowState,
  windowBounds,
} from './window-state';

it('restores saved normal bounds and maximization from disk', () => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-window-'));
  const file = join(directory, 'window-state.json');

  try {
    expect(readWindowState(file)).toBeUndefined();

    const state = {
      bounds: { x: 100, y: 80, width: 1320, height: 840 },
      maximized: true,
    };

    saveWindowState(file, state);
    expect(readWindowState(file)).toEqual(state);
    expect(
      windowBounds(readWindowState(file)?.bounds, {
        x: 0,
        y: 25,
        width: 1920,
        height: 1055,
      }),
    ).toEqual(state.bounds);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('centres a larger first window within the display work area', () => {
  const area = { x: 0, y: 25, width: 1920, height: 1055 };

  const bounds = windowBounds(undefined, area);

  expect(bounds).toMatchObject({ width: defaultWidth, height: defaultHeight });
  // Equal gaps either side, allowing a pixel of rounding.
  expect(
    Math.abs(bounds.x - area.x - (area.x + area.width - bounds.x - bounds.width)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      bounds.y - area.y - (area.y + area.height - bounds.y - bounds.height),
    ),
  ).toBeLessThanOrEqual(1);
});

it('keeps a window from a disconnected monitor visible on a smaller screen', () => {
  expect(
    windowBounds(
      { x: 2400, y: 300, width: 1600, height: 1000 },
      { x: 0, y: 25, width: 1280, height: 775 },
    ),
  ).toEqual({ x: 0, y: 25, width: 1280, height: 775 });
});
