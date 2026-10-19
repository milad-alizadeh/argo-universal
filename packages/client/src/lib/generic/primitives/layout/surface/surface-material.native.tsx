import { View } from 'react-native';
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
      interactive={Boolean(props.onPress)}
      fallbackClassName={surfaceClass({ ...props, padding: 0 }, 'plain')}
    >
      <View className={contentPadding(props)}>{props.children}</View>
    </LiquidGlass>
  );
}
