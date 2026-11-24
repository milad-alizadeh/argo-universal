import { type DiagramPalette, drawDiagram } from '@repo/contracts/kit-diagram';
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

// The real layout, counted.
function countedLayout(): { layouts: () => number; draw: typeof drawDiagram } {
  let count = 0;

  return {
    layouts: () => count,
    draw: (source, colours) => {
      count += 1;

      return drawDiagram(source, colours);
    },
  };
}

it('lays a diagram out once when a row remounts and draws it again', () => {
  const { layouts, draw } = countedLayout();
  const first = drawnState(flowchartDiagram.source, palette, draw);
  const remounted = drawnState(flowchartDiagram.source, { ...palette }, draw);

  expect(first.kind).toBe('drawn');
  expect(remounted).toBe(first);
  expect(layouts()).toBe(1);
});

it('lays the same diagram out again when the theme changes its colours', () => {
  const { layouts, draw } = countedLayout();
  // Its own diagram, so the first test's drawing is not found.
  const source = `${flowchartDiagram.source}\n  E --> F`;
  drawnState(source, palette, draw);

  drawnState(source, { ...palette, background: 'other colour' }, draw);

  expect(layouts()).toBe(2);
});
