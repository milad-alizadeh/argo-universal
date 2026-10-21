import type { SFSymbol } from 'expo-symbols';
import type * as React from 'react';
import { customSymbolPath, isCustomSymbol } from '../custom-symbols';
import type { SystemDrawing } from '../drawn-symbol';
import {
  type RenderSymbolImage,
  useSymbolImage,
  useSymbolImageRenderer,
} from '../symbol-images';
import { referenceShare } from '../symbol-path';
import { tablerSymbolPath } from '../tabler-symbols';
import { materialGlyphScale } from './material-glyph-scale';
import { MaterialGlyph } from './material-glyph.web';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { PathMask, SymbolMask } from './symbol-mask.web';

/*
 * SF Symbols draw like text: every symbol in a role at one point size, the one that makes `circle` fill
 * `referenceShare` of the role's box, so narrow symbols such as chevrons stay narrow. A symbol larger than `circle`
 * shrinks to `circle`'s size, so wide ones such as the Sessions bubbles keep to the box.
 */
const referenceSymbol = 'circle';

interface SymbolBox {
  width: number;
  height: number;
}

function fitScale(pixels: number, ...boxes: SymbolBox[]): number {
  const extents = boxes.flatMap(({ width, height }) => [width, height]);

  return (pixels * referenceShare) / Math.max(...extents);
}

type GlyphDrawingProps = Pick<
  SymbolGlyphProps,
  'symbol' | 'pixels' | 'weight' | 'fitArtwork'
>;

/*
 * The desktop app on macOS draws SF Symbols from the system and Argo's custom symbols from their paths; the browser
 * and other desktops draw Material Symbols. Tabler symbols draw from their paths everywhere.
 */
export function GlyphDrawing(props: GlyphDrawingProps): React.JSX.Element {
  const render = useSymbolImageRenderer();

  if (props.symbol.kind === 'tabler')
    return (
      <PathMask
        path={tablerSymbolPath(props.symbol.tabler)}
        pixels={props.pixels}
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

  return <MaterialGlyph {...props} pixels={materialPixels(props)} />;
}

// The role's pixels are the slot, and every Material glyph takes the same share of it.
function materialPixels(props: SystemGlyphProps): number {
  return props.pixels * materialGlyphScale;
}

interface AppleSymbolImageProps extends Pick<
  SymbolGlyphProps,
  'pixels' | 'fitArtwork'
> {
  render: RenderSymbolImage;
  sf: SystemDrawing['sf'];
}

function AppleSymbolImage(props: AppleSymbolImageProps): React.JSX.Element {
  if (isCustomSymbol(props.sf))
    return <PathMask path={customSymbolPath(props.sf)} pixels={props.pixels} />;

  return <MaskedSymbol {...props} sf={props.sf} />;
}

interface MaskedSymbolProps extends Pick<
  SymbolGlyphProps,
  'pixels' | 'fitArtwork'
> {
  render: RenderSymbolImage;
  sf: SFSymbol;
}

// The system image is the mask and the text colour fills it, so the symbol follows colour like the other icons.
function MaskedSymbol(props: MaskedSymbolProps): React.JSX.Element | null {
  const pointSize = Math.round(props.pixels * globalThis.devicePixelRatio);
  const image = useSymbolImage(props.render, { name: props.sf, pointSize });

  const reference = useSymbolImage(props.render, {
    name: referenceSymbol,
    pointSize,
  });

  if (!image || !reference) return null;
  const scale = imageScale(props, reference, image);

  return <SymbolMask {...image} scale={scale} />;
}

const artworkShare = 0.9;

function imageScale(
  props: MaskedSymbolProps,
  reference: SymbolBox,
  image: SymbolBox,
): number {
  return props.fitArtwork
    ? (props.pixels * artworkShare) / Math.max(image.width, image.height)
    : fitScale(props.pixels, reference, image);
}
