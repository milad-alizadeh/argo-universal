import type { SFSymbol } from 'expo-symbols';
import type * as React from 'react';
import { chevronSymbols, desktopChevronScale } from '../chevron-scale';
import { customSymbolPath, isCustomSymbol } from '../custom-symbols';
import type { SystemDrawing } from '../drawn-symbol';
import {
  type RenderSymbolImage,
  useSymbolImage,
  useSymbolImageRenderer,
} from '../symbol-images';
import { MaterialGlyph } from './material-glyph.web';
import { SvgSymbolGlyph } from './svg-symbol';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { PathMask, SymbolMask } from './symbol-mask.web';

type GlyphDrawingProps = Pick<SymbolGlyphProps, 'symbol' | 'pixels'>;

/*
 * The desktop app on macOS draws SF Symbols from the system and Argo's custom symbols from their paths; the browser
 * and other desktops draw Material Symbols. SVG symbols draw from their components everywhere (ADR-0041).
 */
export function GlyphDrawing(props: GlyphDrawingProps): React.JSX.Element {
  const render = useSymbolImageRenderer();

  if (props.symbol.kind === 'svg')
    return (
      <SvgSymbolGlyph
        name={props.symbol.svg}
        pixels={props.pixels}
        testID="svg-symbol"
      />
    );

  return <SystemGlyph {...props} symbol={props.symbol} render={render} />;
}

interface SystemGlyphProps extends Omit<GlyphDrawingProps, 'symbol'> {
  symbol: SystemDrawing;
  render: ReturnType<typeof useSymbolImageRenderer>;
}

function SystemGlyph(props: SystemGlyphProps): React.JSX.Element {
  if (props.render)
    return (
      <AppleSymbolImage {...props} render={props.render} sf={props.symbol.sf} />
    );

  return <MaterialGlyph {...props} />;
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

/*
 * An SF Symbol fills most of its point size where a Material glyph keeps padding in its 24-unit grid, so at one size
 * the SF Symbol reads larger. Every SF Symbol on desktop draws at this share of its box to match Material.
 */
const appleSymbolScale = 0.8;

const symbolScale = (sf: SFSymbol): number =>
  appleSymbolScale * (chevronSymbols.has(sf) ? desktopChevronScale : 1);

// The system image is the mask and the text colour fills it, so the symbol follows colour like the other icons.
function MaskedSymbol(props: MaskedSymbolProps): React.JSX.Element | null {
  const ratio = globalThis.devicePixelRatio;
  const pointSize = Math.round(props.pixels * symbolScale(props.sf) * ratio);
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
