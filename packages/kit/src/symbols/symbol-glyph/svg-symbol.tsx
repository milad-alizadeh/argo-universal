import type * as React from 'react';
import { type ColorValue, Platform, View } from 'react-native';
import { withUniwind } from 'uniwind';
import { cn } from '../../utils';
import { decorativeGlyph } from '../decorative-glyph';
import { type SvgSymbolName, svgSymbols } from '../svg-symbols';

export interface SvgSymbolGlyphProps {
  name: SvgSymbolName;
  pixels: number;
  // The icon's text colour classes: the tint natively, and the CSS colour of the box on web.
  colorClassName?: string;
  tintColor?: ColorValue;
  testID: string;
}

// One of Argo's own SVG glyphs (ADR-0041): the same react-native-svg tree on every platform, filling the icon's box.
function SvgSymbolDrawing(props: SvgSymbolGlyphProps): React.JSX.Element {
  const Glyph = svgSymbols[props.name];

  return (
    <View
      {...decorativeGlyph}
      testID={props.testID}
      style={{ width: props.pixels, height: props.pixels }}
      className={cn('items-center justify-center', props.colorClassName)}
    >
      <Glyph size={props.pixels} color={props.tintColor} />
    </View>
  );
}

export const SvgSymbolGlyph =
  Platform.OS === 'web'
    ? SvgSymbolDrawing
    : withUniwind(SvgSymbolDrawing, {
        tintColor: { fromClassName: 'colorClassName', styleProperty: 'color' },
      });
