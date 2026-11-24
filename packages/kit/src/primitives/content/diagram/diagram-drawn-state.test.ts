import type { DiagramPalette } from '@repo/contracts/kit-diagram';
import { drawDiagram } from '@repo/contracts/kit-diagram';
import { beforeEach, expect, it, vi } from 'vitest';
import { drawnState } from './diagram-drawn-state';
import { flowchartDiagram } from './diagram-fixtures';

vi.mock('@repo/contracts/kit-diagram', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@repo/contracts/kit-diagram')>();

  return {
    ...actual,
    drawDiagram: vi.fn<typeof actual.drawDiagram>(actual.drawDiagram),
  };
});

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

beforeEach(() => {
  vi.mocked(drawDiagram).mockClear();
});

it('lays a diagram out once when a row remounts and draws it again', () => {
  const first = drawnState(flowchartDiagram.source, palette);
  const remounted = drawnState(flowchartDiagram.source, { ...palette });

  expect(first.kind).toBe('drawn');
  expect(remounted).toBe(first);
  expect(drawDiagram).toHaveBeenCalledTimes(1);
});

it('lays the same diagram out again when the theme changes its colours', () => {
  const light = drawnState(flowchartDiagram.source, palette);

  const dark = drawnState(flowchartDiagram.source, {
    ...palette,
    background: 'other colour',
  });

  expect(dark).not.toBe(light);
});
