import { GlassView } from 'expo-glass-effect';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';
import { useNativeTheme } from '#lib/generic/native-theme';
import { cn } from '#lib/generic/utils';
import { liquidGlassAvailable } from './liquid-glass-available';
import { FallbackSurface } from './liquid-glass-fallback';
import type { LiquidGlassProps } from './liquid-glass-props';

const cornerClassName = {
  card: 'rounded-surface',
  capsule: 'rounded-full',
} as const;

const glassLayout = ({ className, corners }: LiquidGlassProps): string =>
  cn(className, cornerClassName[corners]);

// Where the system draws Liquid Glass, it draws it in the App's light or dark; elsewhere the caller's surface shows.
export function LiquidGlass(props: LiquidGlassProps): React.JSX.Element {
  if (!liquidGlassAvailable || props.glass === false)
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
