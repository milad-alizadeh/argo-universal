import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import {
  LiquidGlass,
  liquidGlassAvailable,
} from '#primitives/content/liquid-glass';
import type { SurfaceProps } from './surface-props';
import {
  contentPadding,
  glassCorners,
  surfaceClass,
} from './surface-treatment';

export function SurfaceMaterial(props: SurfaceProps): React.JSX.Element {
  if (props.kind === 'glass' && liquidGlassAvailable)
    return <GlassMaterial {...props} />;

  return <View className={surfaceClass(props, 'plain')}>{props.children}</View>;
}

function GlassMaterial(props: SurfaceProps): React.JSX.Element {
  return (
    <LiquidGlass
      corners={glassCorners}
      className={props.fill ? 'flex-1' : undefined}
      interactive={Boolean(props.onPress)}
      fallbackClassName={surfaceClass({ ...props, padding: 0 }, 'plain')}
    >
      {glassContent(props)}
    </LiquidGlass>
  );
}

function glassContent(props: SurfaceProps): ReactNode {
  // A padding-free fill already sizes its children through the native host.
  if (props.fill && !props.padding) return props.children;

  return (
    <View className={cn(props.fill && 'flex-1', contentPadding(props))}>
      {props.children}
    </View>
  );
}
