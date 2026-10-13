import { type SFSymbol, SymbolView } from 'expo-symbols';
import type * as React from 'react';
import type { CSSProperties } from 'react';
import { cn } from '../../utils';
import {
  customSymbolBox,
  customSymbolImage,
  isCustomSymbol,
} from '../custom-symbols';
import {
  type RenderSymbolImage,
  useSymbolImage,
  useSymbolImageRenderer,
} from '../symbol-images';
import type { SymbolGlyphProps } from './symbol-glyph';
import { symbolWeight } from './symbol-weight';

/*
 * SF Symbols draw like text: every symbol in a role at one point size, the one that makes `circle` fill
 * `referenceShare` of the role's box, so narrow symbols such as chevrons stay narrow. A symbol larger than `circle`
 * shrinks to `circle`'s size, so wide ones such as the Sessions bubbles keep to the box.
 */
const referenceSymbol = 'circle';
// Leaves `circle`'s ink at three quarters of the box: 18 points on the rail, 12 beside Body text.
const referenceShare = 0.88;
// `circle` is this wide in 100-point type, the units of Argo's custom symbol paths.
const referenceSymbolCustomUnits = 117;

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

function extentsOf(...boxes: SymbolBox[]): number[] {
  return boxes.flatMap(({ width, height }) => [width, height]);
}

function fitScale(pixels: number, extents: number[]): number {
  return (pixels * referenceShare) / Math.max(...extents);
}

export function SymbolGlyph(props: SymbolGlyphProps): React.JSX.Element {
  return (
    // data-icon lets a parent style the icons inside it, as `has-[>[data-icon]]` does on Button.
    <span
      data-icon
      data-testid={props.testID}
      aria-hidden
      className={cn(props.colorClassName, '[&>div]:text-inherit!')}
      style={{ ...glyphBox, width: props.pixels, height: props.pixels }}
    >
      <GlyphDrawing {...props} />
    </span>
  );
}

/*
 * The desktop app on macOS draws SF Symbols from the system and Argo's custom symbols from their paths; the browser
 * and other desktops draw Material Symbols.
 */
function GlyphDrawing({
  sf,
  pixels,
  ...props
}: SymbolGlyphProps): React.JSX.Element {
  const render = useSymbolImageRenderer();
  if (render)
    return <AppleSymbolImage render={render} sf={sf} pixels={pixels} />;
  return <MaterialGlyph {...props} pixels={pixels} />;
}

type MaterialGlyphProps = Pick<
  SymbolGlyphProps,
  'material' | 'filled' | 'pixels' | 'weight'
>;

function MaterialGlyph(props: MaterialGlyphProps): React.JSX.Element {
  return (
    <SymbolView
      key={String(props.filled)}
      name={{ web: props.material }}
      size={props.pixels}
      weight={symbolWeight(props.filled, props.weight)}
      tintColor="currentColor"
    />
  );
}

interface AppleSymbolImageProps extends Pick<
  SymbolGlyphProps,
  'sf' | 'pixels'
> {
  render: RenderSymbolImage;
}

function AppleSymbolImage({
  render,
  sf,
  pixels,
}: AppleSymbolImageProps): React.JSX.Element {
  if (isCustomSymbol(sf)) return <CustomSymbolImage sf={sf} pixels={pixels} />;
  return <MaskedSymbol render={render} sf={sf} pixels={pixels} />;
}

interface CustomSymbolImageProps extends Pick<SymbolGlyphProps, 'pixels'> {
  sf: Parameters<typeof customSymbolBox>[0];
}

function CustomSymbolImage({
  sf,
  pixels,
}: CustomSymbolImageProps): React.JSX.Element {
  const box = customSymbolBox(sf);
  const scale = fitScale(pixels, [
    referenceSymbolCustomUnits,
    ...extentsOf(box),
  ]);
  return <SymbolMask url={customSymbolImage(sf)} {...box} scale={scale} />;
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
  const scale = fitScale(props.pixels, extentsOf(reference, image));
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
