import { describe, expect, it } from 'vitest';
import { type DiagramPalette, checkDiagram, drawDiagram } from './index';

const palette: DiagramPalette = {
  background: 'token-background',
  text: 'token-text',
  textSecondary: 'token-text-secondary',
  textMuted: 'token-text-muted',
  line: 'token-line',
  arrow: 'token-arrow',
  nodeFill: 'token-node-fill',
  nodeStroke: 'token-node-stroke',
  groupHeader: 'token-group-header',
  innerStroke: 'token-inner-stroke',
  tones: {},
};

const skippedLine = 'sequenceDiagram\n A->>B: hi\n this is not mermaid';

describe('the render seam', () => {
  it('draws nothing and checks as drawing nothing for a header-only fence', () => {
    expect(drawDiagram('flowchart TD', palette)).toBeUndefined();
    expect(checkDiagram('flowchart TD')).toMatchObject({
      valid: false,
      problems: [{ line: 1, message: 'The diagram draws nothing.' }],
    });
  });

  it('still reports a skipped line when checked twice', () => {
    const problems = [{ line: 3 }];

    expect(checkDiagram(skippedLine)).toMatchObject({ problems });
    expect(checkDiagram(skippedLine)).toMatchObject({ problems });
  });
});
