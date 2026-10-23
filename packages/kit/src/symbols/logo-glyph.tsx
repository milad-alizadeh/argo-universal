import type * as React from 'react';
import { type ColorValue, Platform, View } from 'react-native';
import { withUniwind } from 'uniwind';
import { cn } from '../utils';
import type { LogoSource } from './logo-source';

export interface LogoGlyphProps {
  source: LogoSource;
  pixels: number;
  // The icon's text colour classes: the tint natively, and the CSS colour of the box on web.
  colorClassName: string;
  tintColor?: ColorValue;
  testID: string;
}

/*
 * A logo fills the share of the icon's box that `circle` fills, so a round mark matches the symbols beside it.
 * Its `currentColor` fills take the tint natively; on web the box's text class colours them.
 */
function LogoDrawing(props: LogoGlyphProps): React.JSX.Element {
  return (
    <View
      testID={props.testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={props.source.label}
      style={{ width: props.pixels, height: props.pixels }}
      className={cn('items-center justify-center', props.colorClassName)}
    >
      <LogoSvg {...props} />
    </View>
  );
}

function LogoSvg({
  source,
  pixels,
  tintColor,
}: LogoGlyphProps): React.JSX.Element {
  const Logo = source.svg;

  return <Logo width={pixels} height={pixels} color={tintColor} />;
}

export const LogoGlyph =
  Platform.OS === 'web'
    ? LogoDrawing
    : withUniwind(LogoDrawing, {
        tintColor: { fromClassName: 'colorClassName', styleProperty: 'color' },
      });
