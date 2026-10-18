import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import {
  LiquidGlass,
  liquidGlassAvailable,
} from '#primitives/content/liquid-glass';
import type { SurfaceProps } from './surface-props';
import { paddingClass, surfaceClass } from './surface-styles';

export function SurfaceMaterial(props: SurfaceProps): React.JSX.Element {
  if (props.kind === 'glass' && liquidGlassAvailable)
    return <GlassMaterial {...props} />;

  const treatment = nativeTreatment(props.kind);

  return (
    <View className={cn(treatment, surfacePadding(props.padding))}>
      {props.children}
    </View>
  );
}

function GlassMaterial(props: SurfaceProps): React.JSX.Element {
  return (
    <LiquidGlass
      corners="surface"
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
  return kind === 'glass'
    ? 'rounded-2xl bg-card shadow-card'
    : surfaceClass[kind];
}
