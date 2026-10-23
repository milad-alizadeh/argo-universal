import type * as React from 'react';
import type { ColorValue } from 'react-native';
import Svg from 'react-native-svg';

export interface SvgSymbolProps {
  size: number;
  // Unset, the strokes take `currentColor`, which the web's text class sets.
  color?: ColorValue;
}

interface SvgSymbolFrameProps extends SvgSymbolProps {
  children: React.ReactNode;
}

// The 24-point grid and 2-point round stroke every glyph in this folder is drawn on (ADR-0041).
const strokeProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function SvgSymbolFrame({
  size,
  color = 'currentColor',
  children,
}: SvgSymbolFrameProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} stroke={color} {...strokeProps}>
      {children}
    </Svg>
  );
}
