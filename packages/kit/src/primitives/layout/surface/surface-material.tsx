import { View } from 'react-native';
import type { SurfaceProps } from './surface-props';
import { surfaceClass } from './surface-treatment';

export function SurfaceMaterial(props: SurfaceProps): React.JSX.Element {
  return <View className={surfaceClass(props, 'drawn')}>{props.children}</View>;
}
