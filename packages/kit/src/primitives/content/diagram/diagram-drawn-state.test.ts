import type { DiagramPalette } from '@repo/contracts/kit-diagram';
import { expect, it } from 'vitest';
import { drawnState } from './diagram-drawn-state';
import { flowchartDiagram } from './diagram-fixtures';

const palette: DiagramPalette = {
  background: 'colour',
  text: 'colour',
  textSecondary: 'colour',
  textMuted: 'colour',
  line: 'colour',
  arrow: 'colour',
  nodeFill: 'colour',
  nodeStroke: 'colour',
  groupHeader: 'colour',
  innerStroke: 'colour',
  tones: {},
};

it('reuses the drawing of a diagram a row draws again after it remounts', () => {
  const first = drawnState(flowchartDiagram.source, palette);
  const remounted = drawnState(flowchartDiagram.source, { ...palette });

  expect(first.kind).toBe('drawn');
  expect(remounted).toBe(first);
});

it('draws the same diagram again when the theme changes its colours', () => {
  const light = drawnState(flowchartDiagram.source, palette);

  const dark = drawnState(flowchartDiagram.source, {
    ...palette,
    background: 'other colour',
  });

  expect(dark).not.toBe(light);
});
