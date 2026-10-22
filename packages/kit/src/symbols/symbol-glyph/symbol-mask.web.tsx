import type * as React from 'react';
import type { CSSProperties } from 'react';
import {
  type SymbolPath,
  symbolPathImage,
  symbolPathSize,
} from '../symbol-path';
import type { SymbolGlyphProps } from './symbol-glyph-props';

interface SymbolBox {
  width: number;
  height: number;
}

const maskBox = {
  display: 'block',
  flexShrink: 0,
  backgroundColor: 'currentColor',
} as const;

interface PathMaskProps extends Pick<SymbolGlyphProps, 'pixels'> {
  path: SymbolPath;
}

export function PathMask({ path, pixels }: PathMaskProps): React.JSX.Element {
  const size = symbolPathSize(path, pixels);

  return <SymbolMask url={symbolPathImage(path)} {...size} />;
}

interface SymbolMaskProps extends SymbolBox {
  url: string;
}

function maskStyle({ url, width, height }: SymbolMaskProps): CSSProperties {
  const mask = `url("${url}") center / 100% 100% no-repeat`;

  return {
    ...maskBox,
    width,
    height,
    mask,
    WebkitMask: mask,
  };
}

// Centred in the icon's box.
export function SymbolMask(props: SymbolMaskProps): React.JSX.Element {
  return <span style={maskStyle(props)} />;
}
