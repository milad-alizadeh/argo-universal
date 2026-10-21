import { expect, it } from 'vitest';
import {
  nativeNodeVisible,
  type Bounds,
  type ViewportNode,
} from './native-visibility-bounds';

const window = { left: 0, top: 0, right: 800, bottom: 1000 };

function node(
  bounds: Bounds,
  parentElement: ViewportNode | null = null,
  tagName = 'RN:ScrollView',
): ViewportNode {
  return { tagName, parentElement, getBoundingClientRect: () => bounds };
}

it('excludes shelves inside the window but clipped by their scroll panel', () => {
  const panel = node({ left: 0, top: 200, right: 800, bottom: 400 });

  const shelf = node(
    { left: 0, top: 450, right: 800, bottom: 550 },
    panel,
    'RN:View',
  );

  expect(nativeNodeVisible(shelf, window, new Map())).toBe(false);
});

it('keeps partially visible shelves and follows the current ancestor bounds', () => {
  let top = 350;
  const panel = node({ left: 0, top: 200, right: 800, bottom: 400 });

  const shelf = {
    tagName: 'RN:View',
    parentElement: panel,
    getBoundingClientRect: (): Bounds => ({
      left: 0,
      top,
      right: 800,
      bottom: top + 100,
    }),
  };

  expect(nativeNodeVisible(shelf, window, new Map())).toBe(true);
  top = 450;
  expect(nativeNodeVisible(shelf, window, new Map())).toBe(false);
  top = 250;
  expect(nativeNodeVisible(shelf, window, new Map())).toBe(true);
});

it('intersects nested vertical and horizontal scroll viewports', () => {
  const outer = node({ left: 100, top: 200, right: 500, bottom: 600 });

  const inner = node(
    { left: 400, top: 100, right: 700, bottom: 400 },
    outer,
    'RN:AndroidHorizontalScrollView',
  );

  const hidden = node(
    { left: 550, top: 250, right: 650, bottom: 350 },
    inner,
    'RN:View',
  );

  const visible = node(
    { left: 450, top: 250, right: 490, bottom: 350 },
    inner,
    'RN:View',
  );

  expect(nativeNodeVisible(hidden, window, new Map())).toBe(false);
  expect(nativeNodeVisible(visible, window, new Map())).toBe(true);
});

it('rejects a shelf when its nested scroll panel lies outside the outer panel', () => {
  const outer = node({ left: 0, top: 100, right: 800, bottom: 200 });
  const inner = node({ left: 0, top: 300, right: 800, bottom: 400 }, outer);

  const shelf = node(
    { left: 0, top: 0, right: 800, bottom: 500 },
    inner,
    'RN:View',
  );

  expect(nativeNodeVisible(shelf, window, new Map())).toBe(false);
});
