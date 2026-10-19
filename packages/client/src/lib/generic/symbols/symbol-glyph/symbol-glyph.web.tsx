import type * as React from 'react';
import { cn } from '../../utils';
import { GlyphDrawing } from './glyph-drawing.web';
import type { SymbolGlyphProps } from './symbol-glyph-props';

const glyphBox = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  userSelect: 'none',
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontSynthesis: 'none',
} as const;

export function SymbolGlyph(props: SymbolGlyphProps): React.JSX.Element {
  return (
    // data-icon lets a parent style the icons inside it, as `has-[>[data-icon]]` does on Button.
    <span
      data-icon
      data-testid={props.testID}
      aria-hidden
      className={cn(props.colorClassName, '*:text-inherit!')}
      style={{ ...glyphBox, width: props.pixels, height: props.pixels }}
    >
      <GlyphDrawing {...props} />
    </span>
  );
}
