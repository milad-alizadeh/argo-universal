import type * as React from 'react';
import { GlyphScaleContext } from '../../../symbols/glyph-scale-context';

/*
 * Icons beside Secondary text, as in a status pill, draw at the desktop sizes on every width: a phone steps its glyphs
 * up for its larger body text, which would leave them too big beside the smaller Secondary line.
 */
export function SecondaryGlyphs(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <GlyphScaleContext value="wide">{props.children}</GlyphScaleContext>;
}
