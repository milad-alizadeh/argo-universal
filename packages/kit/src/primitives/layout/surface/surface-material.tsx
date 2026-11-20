import { useContext } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SurfaceFade } from './surface-fade';
import type { SurfaceProps } from './surface-props';
import { surfaceClass } from './surface-treatment';

export function SurfaceMaterial(props: SurfaceProps): React.JSX.Element {
  const fade = useContext(SurfaceFade);
  const className = surfaceClass(props, 'drawn');

  if (!fade) return <View className={className}>{props.children}</View>;

  return (
    <Animated.View className={className} style={fade}>
      {props.children}
    </Animated.View>
  );
}
