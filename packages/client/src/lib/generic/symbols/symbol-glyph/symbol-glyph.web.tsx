import { type SFSymbol, SymbolView } from 'expo-symbols';
import type * as React from 'react';
import type { CSSProperties } from 'react';
import { cn } from '../../utils';
import { customSymbolPath, isCustomSymbol } from '../custom-symbols';
import type { SystemDrawing } from '../drawn-symbol';
import {
  type RenderSymbolImage,
  useSymbolImage,
  useSymbolImageRenderer,
} from '../symbol-images';
import {
  referenceShare,
  type SymbolPath,
  symbolPathImage,
  symbolPathSize,
} from '../symbol-path';
import { tablerSymbolPath } from '../tabler-symbols';
import type { SymbolGlyphProps } from './symbol-glyph-props';
import { symbolWeight } from './symbol-weight';

/*
 * SF Symbols draw like text: every symbol in a role at one point size, the one that makes `circle` fill
 * `referenceShare` of the role's box, so narrow symbols such as chevrons stay narrow. A symbol larger than `circle`
 * shrinks to `circle`'s size, so wide ones such as the Sessions bubbles keep to the box.
 */
const referenceSymbol = 'circle';

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

const maskBox = {
  display: 'block',
  flexShrink: 0,
  backgroundColor: 'currentColor',
} as const;

interface SymbolBox {
  width: number;
  height: number;
}

function fitScale(pixels: number, ...boxes: SymbolBox[]): number {
  const extents = boxes.flatMap(({ width, height }) => [width, height]);

  return (pixels * referenceShare) / Math.max(...extents);
}

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

type GlyphDrawingProps = Pick<SymbolGlyphProps, 'symbol' | 'pixels' | 'weight'>;

/*
 * The desktop app on macOS draws SF Symbols from the system and Argo's custom symbols from their paths; the browser
 * and other desktops draw Material Symbols. Tabler symbols draw from their paths everywhere.
 */
function GlyphDrawing({
  symbol,
  pixels,
  weight,
}: GlyphDrawingProps): React.JSX.Element {
  const render = useSymbolImageRenderer();

  if (symbol.kind === 'tabler')
    return <PathMask path={tablerSymbolPath(symbol.tabler)} pixels={pixels} />;

  if (render)
    return <AppleSymbolImage render={render} sf={symbol.sf} pixels={pixels} />;

  return <MaterialGlyph symbol={symbol} pixels={pixels} weight={weight} />;
}

interface MaterialGlyphProps extends Pick<
  SymbolGlyphProps,
  'pixels' | 'weight'
> {
  symbol: SystemDrawing;
}

function MaterialGlyph({
  symbol,
  pixels,
  weight,
}: MaterialGlyphProps): React.JSX.Element {
  return (
    <SymbolView
      key={String(symbol.filled)}
      name={{ web: symbol.material }}
      size={pixels}
      weight={symbolWeight(symbol.filled, weight)}
      tintColor="currentColor"
    />
  );
}

interface AppleSymbolImageProps extends Pick<SymbolGlyphProps, 'pixels'> {
  render: RenderSymbolImage;
  sf: SystemDrawing['sf'];
}

function AppleSymbolImage({
  render,
  sf,
  pixels,
}: AppleSymbolImageProps): React.JSX.Element {
  if (isCustomSymbol(sf))
    return <PathMask path={customSymbolPath(sf)} pixels={pixels} />;

  return <MaskedSymbol render={render} sf={sf} pixels={pixels} />;
}

interface PathMaskProps extends Pick<SymbolGlyphProps, 'pixels'> {
  path: SymbolPath;
}

function PathMask({ path, pixels }: PathMaskProps): React.JSX.Element {
  const size = symbolPathSize(path, pixels);

  return <SymbolMask url={symbolPathImage(path)} {...size} scale={1} />;
}

interface MaskedSymbolProps extends Pick<SymbolGlyphProps, 'pixels'> {
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
  const scale = fitScale(props.pixels, reference, image);

  return <SymbolMask {...image} scale={scale} />;
}

interface SymbolMaskProps extends SymbolBox {
  url: string;
  scale: number;
}

function maskStyle({
  url,
  width,
  height,
  scale,
}: SymbolMaskProps): CSSProperties {
  const mask = `url("${url}") center / 100% 100% no-repeat`;

  return {
    ...maskBox,
    width: width * scale,
    height: height * scale,
    mask,
    WebkitMask: mask,
  };
}

// Centred in the icon's box.
function SymbolMask(props: SymbolMaskProps): React.JSX.Element {
  return <span style={maskStyle(props)} />;
}
