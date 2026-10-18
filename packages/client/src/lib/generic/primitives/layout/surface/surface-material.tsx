import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { SurfaceProps } from './surface-props';
import { paddingClass, surfaceClass, cornerClass } from './surface-styles';

export function SurfaceMaterial({
  kind,
  padding = 0,
  children,
}: SurfaceProps): React.JSX.Element {
  const className = cn(
    cornerClass[kind],
    surfaceClass[kind],
    paddingClass[padding],
  );

  return <View className={className}>{children}</View>;
}
