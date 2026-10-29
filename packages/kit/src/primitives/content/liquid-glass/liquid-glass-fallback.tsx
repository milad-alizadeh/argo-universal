import type * as React from 'react';
import { useContext } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import {
  floatingGlassFallback,
  glassCornerClass,
  LiquidGlassMaterial,
} from './liquid-glass-material';
import type { LiquidGlassProps } from './liquid-glass-props';

export function FallbackSurface(props: LiquidGlassProps): React.JSX.Element {
  const inherited = useContext(LiquidGlassMaterial);

  return (
    <View className={fallbackClass(props, inherited)}>
      <LiquidGlassMaterial value={true}>{props.children}</LiquidGlassMaterial>
    </View>
  );
}

function fallbackClass(props: LiquidGlassProps, inherited: boolean): string {
  return cn(
    props.className,
    glassCornerClass[props.corners],
    !inheritsMaterial(props, inherited) &&
      (props.fallbackClassName ?? floatingGlassFallback),
  );
}

function inheritsMaterial(
  props: LiquidGlassProps,
  inherited: boolean,
): boolean {
  return Boolean(props.inherit && inherited && props.glass !== false);
}

FallbackSurface satisfies React.ComponentType<LiquidGlassProps>;
