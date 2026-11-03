import type { SFSymbol } from 'expo-symbols';
import type * as React from 'react';
import { chevronSymbols } from '../chevron-scale';
import { customSymbolPath, isCustomSymbol } from '../custom-symbols';
import type { SystemDrawing } from '../drawn-symbol';
import { appleSymbolShare } from '../glyph-sizing';
import { type RenderSymbolImage, useSymbolImage } from '../symbol-images';
import { materialGlyph } from './material-glyph.web';
import { SvgSymbolGlyph } from './svg-symbol';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { PathMask, SymbolMask } from './symbol-mask.web';

type GlyphDrawingProps = Pick<SymbolGlyphProps, 'symbol' | 'pixels'>;

// The system's symbol images on the macOS desktop app, else none.
type GlyphRenderer = RenderSymbolImage | null;

/*
 * The desktop app on macOS draws SF Symbols from the system and Argo's custom symbols from their paths; the browser
 * and other desktops draw Material Symbols. SVG symbols draw from their components everywhere (ADR-0041). A plain
 * function, not a component, so a glyph is no deeper than the drawing it chooses.
 */
export function glyphDrawing(
  props: GlyphDrawingProps,
  render: GlyphRenderer,
): React.JSX.Element {
  if (props.symbol.kind === 'svg')
    return (
      <SvgSymbolGlyph
        name={props.symbol.svg}
        pixels={props.pixels}
        testID="svg-symbol"
      />
    );

  return systemGlyph(props.symbol, props.pixels, render);
}

function systemGlyph(
  symbol: SystemDrawing,
  pixels: number,
  render: GlyphRenderer,
): React.JSX.Element {
  if (render)
    return <AppleSymbolImage pixels={pixels} render={render} sf={symbol.sf} />;

  return materialGlyph({ symbol, pixels });
}

interface AppleSymbolImageProps extends Pick<SymbolGlyphProps, 'pixels'> {
  render: RenderSymbolImage;
  sf: SystemDrawing['sf'];
}

function AppleSymbolImage(props: AppleSymbolImageProps): React.JSX.Element {
  if (isCustomSymbol(props.sf))
    return <PathMask path={customSymbolPath(props.sf)} pixels={props.pixels} />;

  return <MaskedSymbol {...props} sf={props.sf} />;
}

interface MaskedSymbolProps extends Pick<SymbolGlyphProps, 'pixels'> {
  render: RenderSymbolImage;
  sf: SFSymbol;
}

// The system image is the mask and the text colour fills it, so the symbol follows colour like the other icons.
function MaskedSymbol(props: MaskedSymbolProps): React.JSX.Element | null {
  const ratio = globalThis.devicePixelRatio;
  const share = appleSymbolShare(chevronSymbols.has(props.sf));
  const pointSize = Math.round(props.pixels * share * ratio);
  const image = useSymbolImage(props.render, { name: props.sf, pointSize });

  if (!image) return null;

  return (
    <SymbolMask
      url={image.url}
      width={image.width / ratio}
      height={image.height / ratio}
    />
  );
}
