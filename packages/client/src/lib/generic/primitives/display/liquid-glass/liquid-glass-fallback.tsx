import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { LiquidGlassProps } from './liquid-glass-props';

// Where the system has no Liquid Glass: the caller's own surface.
export function FallbackSurface({
  fallbackClassName,
  className,
  children,
}: LiquidGlassProps): React.JSX.Element {
  return <View className={cn(className, fallbackClassName)}>{children}</View>;
}
