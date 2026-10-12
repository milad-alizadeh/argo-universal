import { describe, expect, it } from 'vitest';
import { swiftFontFace } from './swift-font-face';

describe('the SwiftUI face for a text role', () => {
  it.each([
    { face: 'the system face', family: 'System', expected: {} },
    {
      face: 'the mono face',
      family: 'ui-monospace',
      expected: { design: 'monospaced' },
    },
    { face: 'no family', family: undefined, expected: {} },
    {
      face: 'a bundled font',
      family: 'SF Mono',
      expected: { family: 'SF Mono' },
    },
  ])('draws $face as SwiftUI names it', (row) => {
    expect(swiftFontFace(row.family)).toEqual(row.expected);
  });
});
