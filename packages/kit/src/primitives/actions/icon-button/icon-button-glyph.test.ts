import { describe, expect, it } from 'vitest';
import { iconButtonGlyph } from './icon-button-glyph';

describe('iconButtonGlyph', () => {
  it('names an SF Symbol for a system icon', () => {
    expect(iconButtonGlyph('arrow-up', false)).toEqual({
      kind: 'system',
      name: 'arrow.up',
    });
  });

  it('draws Argo’s own symbol from the asset catalog', () => {
    expect(iconButtonGlyph('agent', false)).toEqual({
      kind: 'asset',
      name: 'custom.robot',
    });
  });

  // The Composer's Start Conversation button drew its spoken name in the circle, as SwiftUI does with no image.
  it('hosts an SVG icon rather than leaving the button a text label', () => {
    expect(iconButtonGlyph('voice-bars', false)).toEqual({ kind: 'hosted' });
  });
});
