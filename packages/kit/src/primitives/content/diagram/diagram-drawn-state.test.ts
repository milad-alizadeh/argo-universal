import type { DiagramPalette } from '@repo/contracts/kit-diagram';
import { expect, it } from 'vitest';
import { flowchartDiagram } from './diagram-fixtures';
import { drawnState } from './diagram-drawn-state';

const palette: DiagramPalette = {
  background: '#ffffff',
  text: '#111111',
  textSecondary: '#444444',
  textMuted: '#777777',
  line: '#777777',
  arrow: '#111111',
  nodeFill: '#eeeeee',
  nodeStroke: '#cccccc',
  groupHeader: '#eeeeee',
  innerStroke: '#cccccc',
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
    background: '#000000',
  });

  expect(dark).not.toBe(light);
});
