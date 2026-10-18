import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import {
  LiquidGlass,
  liquidGlassAvailable,
} from '#primitives/content/liquid-glass';
import type { SurfaceProps } from './surface-props';
import { paddingClass, surfaceClass, cornerClass } from './surface-styles';

export function SurfaceMaterial(props: SurfaceProps): React.JSX.Element {
  if (props.kind === 'glass' && liquidGlassAvailable)
    return <GlassMaterial {...props} />;

  return <View className={plainSurfaceClass(props)}>{props.children}</View>;
}

function plainSurfaceClass(props: SurfaceProps): string {
  return cn(
    cornerClass[props.kind],
    nativeTreatment(props.kind),
    surfacePadding(props.padding),
  );
}

function GlassMaterial(props: SurfaceProps): React.JSX.Element {
  return (
    <LiquidGlass
      corners="surface"
      interactive={Boolean(props.onPress)}
      fallbackClassName="rounded-2xl bg-card shadow-card"
    >
      <View className={surfacePadding(props.padding)}>{props.children}</View>
    </LiquidGlass>
  );
}

function surfacePadding(padding: SurfaceProps['padding']): string {
  return paddingClass[padding ?? 0];
}

function nativeTreatment(kind: SurfaceProps['kind']): string {
  return kind === 'glass' ? 'bg-card shadow-card' : surfaceClass[kind];
}
