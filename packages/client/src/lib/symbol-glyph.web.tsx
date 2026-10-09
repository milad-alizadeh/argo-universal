import { SymbolView } from 'expo-symbols';
import type * as React from 'react';
import type { ColorValue } from 'react-native';
import type { SymbolGlyphProps } from './symbol-glyph';
import {
  type RenderSymbolImage,
  useSymbolImage,
  useSymbolImageRenderer,
} from './symbol-images';
import { symbolWeight } from './symbol-weight';

// The desktop app on macOS draws SF Symbols from the system; the browser and other desktops draw Material Symbols.
export function SymbolGlyph({
  sf,
  material,
  pixels,
  tintColor,
  testID,
}: SymbolGlyphProps): React.JSX.Element {
  const render = useSymbolImageRenderer();
  return (
    // data-icon lets a parent style the icons inside it, as `has-[>[data-icon]]` does on Button.
    <span
      data-icon
      data-testid={testID}
      aria-hidden
      style={{
        display: 'flex',
        flexShrink: 0,
        width: pixels,
        height: pixels,
        color: cssColor(tintColor),
        userSelect: 'none',
      }}
    >
      {render ? (
        <MaskedSymbol render={render} sf={sf} pixels={pixels} />
      ) : (
        <SymbolView
          name={{ web: material }}
          size={pixels}
          weight={symbolWeight}
          tintColor={tintColor}
        />
      )}
    </span>
  );
}

interface MaskedSymbolProps extends Pick<SymbolGlyphProps, 'sf' | 'pixels'> {
  render: RenderSymbolImage;
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

function cssColor(color: ColorValue | undefined): string | undefined {
  return typeof color === 'string' ? color : undefined;
}
