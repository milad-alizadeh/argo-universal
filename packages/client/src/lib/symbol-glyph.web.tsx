import { type SFSymbol, SymbolView } from 'expo-symbols';
import type * as React from 'react';
import { customSymbolImage, isCustomSymbol } from './custom-symbols';
import type { SymbolGlyphProps } from './symbol-glyph';
import {
  type RenderSymbolImage,
  useSymbolImage,
  useSymbolImageRenderer,
} from './symbol-images';
import { symbolWeight } from './symbol-weight';

/*
 * The desktop app on macOS draws SF Symbols from the system and Argo's custom symbols from their paths; the browser
 * and other desktops draw Material Symbols.
 */
export function SymbolGlyph({
  sf,
  material,
  pixels,
  colorClassName,
  testID,
}: SymbolGlyphProps): React.JSX.Element {
  const render = useSymbolImageRenderer();
  return (
    // data-icon lets a parent style the icons inside it, as `has-[>[data-icon]]` does on Button.
    <span
      data-icon
      data-testid={testID}
      aria-hidden
      className={colorClassName}
      style={{
        display: 'flex',
        flexShrink: 0,
        width: pixels,
        height: pixels,
        userSelect: 'none',
      }}
    >
      {render ? (
        <AppleSymbolImage render={render} sf={sf} pixels={pixels} />
      ) : (
        <SymbolView
          name={{ web: material }}
          size={pixels}
          weight={symbolWeight}
          tintColor="currentColor"
        />
      )}
    </span>
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
  if (isCustomSymbol(sf)) return <SymbolMask image={customSymbolImage(sf)} />;
  return <MaskedSymbol render={render} sf={sf} pixels={pixels} />;
}

interface MaskedSymbolProps extends Pick<SymbolGlyphProps, 'pixels'> {
  render: RenderSymbolImage;
  sf: SFSymbol;
}

// The system image is the mask and the text colour fills it, so the symbol follows colour like the other icons.
function MaskedSymbol({
  render,
  sf,
  pixels,
}: MaskedSymbolProps): React.JSX.Element | null {
  const image = useSymbolImage(render, {
    name: sf,
    pointSize: Math.round(pixels * globalThis.devicePixelRatio),
  });
  if (!image) return null;
  return <SymbolMask image={image} />;
}

function SymbolMask({ image }: { image: string }): React.JSX.Element {
  const mask = `url("${image}") center / contain no-repeat`;
  return (
    <span
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        backgroundColor: 'currentColor',
        mask,
        WebkitMask: mask,
      }}
    />
  );
}
