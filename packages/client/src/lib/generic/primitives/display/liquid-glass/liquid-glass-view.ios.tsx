import { GlassView } from 'expo-glass-effect';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useNativeTheme } from '#lib/generic/native-theme';
import { cn } from '#lib/generic/utils';
import { FallbackSurface } from './liquid-glass-fallback';
import type { LiquidGlassProps } from './liquid-glass-props';

const shapeClassName = {
  card: 'rounded-surface',
  capsule: 'rounded-full',
} as const;

const glassLayout = ({
  className,
  glassClassName,
  shape,
}: LiquidGlassProps): string =>
  cn(className, glassClassName, shapeClassName[shape]);

// iOS 26 and later draw the system's Liquid Glass in the App's light or dark; earlier iOS keeps the caller's surface.
export function LiquidGlass(props: LiquidGlassProps): React.JSX.Element {
  if (!hasLiquidGlass || props.glass === false)
    return <FallbackSurface {...props} />;
  return <SystemGlass {...props} />;
}

// GlassView takes a resolved style: a className wrapper leaves the glass undrawn.
function SystemGlass(props: LiquidGlassProps): React.JSX.Element {
  const { colorScheme } = useNativeTheme();
  const style = useResolveClassNames(glassLayout(props));
  return (
    <GlassView
      glassEffectStyle="regular"
      isInteractive={props.interactive}
      colorScheme={colorScheme}
      style={style}
    >
      {props.children}
    </GlassView>
  );
}
