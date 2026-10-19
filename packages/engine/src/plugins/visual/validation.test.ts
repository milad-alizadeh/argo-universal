import type { WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { sanitizeTree } from './sanitize-tree';

function node(
  type: string,
  props: WireNode['props'] = {},
  children: WireNode[] = [],
): WireNode {
  return { type, key: type, props, children, slots: {} };
}

const group = 'Canvas.Group';

const rect = 'Canvas.Rect';

const rawColor = '#' + 'fff';

const series = { name: 'Files', tone: 'accent', points: [{ x: 0, y: 1 }] };

const chart = { label: 'Files', kind: 'bar', series: [series] };

const canvas = { label: 'Files', width: 100, height: 100, camera: 'fixed' };

it.each([
  node('Chart', { ...chart, series: Array.from({ length: 9 }, () => series) }),
  node('Chart', { ...chart, series: [{ ...series, tone: rawColor }] }),
  node('Chart', {
    ...chart,
    series: [{ ...series, points: [{ x: 0, y: Infinity }] }],
  }),
  node('Canvas', canvas, [node('Canvas.Image')]),
  node('Canvas', canvas, [node(rect, { tone: 'accent', fill: rawColor })]),
  node(rect, { tone: 'accent' }),
  node('CodeMap'),
])('drops invalid visual nodes with a node and reason: $type', (root) => {
  const result = sanitizeTree(root);
  expect(result.refused).toEqual([
    { node: expect.stringContaining('#'), reason: expect.any(String) },
  ]);
  expect(result.root.type).toBe('Stack');
});

it('keeps bounded token-based Chart and Canvas data', () => {
  const root = node('Stack', { direction: 'column' }, [
    node('Chart', chart),
    node('Canvas', canvas, [
      node(rect, {
        tone: 'accent',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        fill: true,
      }),
    ]),
  ]);

  expect(sanitizeTree(root)).toMatchObject({ root, refused: [] });
});

it('enforces the Canvas shape cap', () => {
  const drawing = node(group);

  const many = Array.from({ length: 20_001 }, (_, index) => ({
    ...drawing,
    key: String(index),
  }));

  expect(refusal(node('Canvas', canvas, many))).toContain('shape cap');
});

it('enforces the Canvas nesting cap', () => {
  let nested = node(group);

  for (let depth = 0; depth < 16; depth += 1)
    nested = node(group, {}, [nested]);
  expect(refusal(node('Canvas', canvas, [nested]))).toContain('depth cap');
});

function refusal(root: WireNode): string | undefined {
  return sanitizeTree(root).refused[0]?.reason;
}
