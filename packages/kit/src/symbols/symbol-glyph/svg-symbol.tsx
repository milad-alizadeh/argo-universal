import type * as React from 'react';
import { type ColorValue, Platform, View } from 'react-native';
import { withUniwind } from 'uniwind';
import { cn } from '../../utils';
import { decorativeGlyph } from '../decorative-glyph';
import type { OwnDrawing } from '../drawn-symbol';
import { type SvgSymbolName, svgSymbols } from '../svg-symbols';
import { MarkupSymbolGlyph } from './markup-symbol';

interface SvgSymbolGlyphProps {
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

const SvgSymbolGlyph =
  Platform.OS === 'web'
    ? SvgSymbolDrawing
    : withUniwind(SvgSymbolDrawing, {
        tintColor: { fromClassName: 'colorClassName', styleProperty: 'color' },
      });

type OwnGlyphProps = Omit<SvgSymbolGlyphProps, 'name'> & {
  drawing: OwnDrawing;
};

// An icon's own drawing, on every platform: one of Argo's SVG glyphs, or a Plugin's markup (ADR-0058).
export function OwnGlyph({
  drawing,
  ...props
}: OwnGlyphProps): React.JSX.Element {
  return drawing.kind === 'svg' ? (
    <SvgSymbolGlyph {...props} name={drawing.svg} />
  ) : (
    <MarkupSymbolGlyph {...props} markup={drawing.markup} />
  );
}
