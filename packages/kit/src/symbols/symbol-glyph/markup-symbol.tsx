import type * as React from 'react';
import { type ColorValue, Platform, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { cn } from '../../utils';
import { decorativeGlyph } from '../decorative-glyph';
import { appleSymbolShare } from '../glyph-sizing';

// A Plugin's mark usually runs edge to edge; drawn at the share an SF Symbol takes, it reads as large as Argo's glyphs.
const markupShare = appleSymbolShare(false);

export interface MarkupSymbolGlyphProps {
  markup: string;
  pixels: number;
  // The icon's text colour classes: the tint natively, and the CSS colour of the box on web.
  colorClassName?: string;
  tintColor?: ColorValue;
  testID: string;
}

/*
 * A Plugin's own icon (ADR-0058): the Server's sanitized markup, every paint `currentColor`, so it takes the tint
 * natively and the box's text colour on web, as Argo's SVG glyphs do, centred in the icon's box.
 */
function MarkupSymbolDrawing(props: MarkupSymbolGlyphProps): React.JSX.Element {
  return (
    <View
      {...decorativeGlyph}
      testID={props.testID}
      style={{ width: props.pixels, height: props.pixels }}
      className={cn('items-center justify-center', props.colorClassName)}
    >
      <MarkupSvg {...props} />
    </View>
  );
}

function MarkupSvg(props: MarkupSymbolGlyphProps): React.JSX.Element {
  return (
    <SvgXml
      xml={props.markup}
      width={Math.round(props.pixels * markupShare)}
      height={Math.round(props.pixels * markupShare)}
      color={props.tintColor}
    />
  );
}

export const MarkupSymbolGlyph =
  Platform.OS === 'web'
    ? MarkupSymbolDrawing
    : withUniwind(MarkupSymbolDrawing, {
        tintColor: { fromClassName: 'colorClassName', styleProperty: 'color' },
      });
