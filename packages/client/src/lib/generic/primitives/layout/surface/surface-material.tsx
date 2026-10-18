import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { SurfaceProps } from './surface-props';
import { paddingClass, surfaceClass } from './surface-styles';

export function SurfaceMaterial({
  kind,
  padding = 0,
  children,
}: SurfaceProps): React.JSX.Element {
  return (
    <View className={cn(surfaceClass[kind], paddingClass[padding])}>
      {children}
    </View>
  );
}
