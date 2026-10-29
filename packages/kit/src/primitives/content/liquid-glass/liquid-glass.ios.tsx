import { GlassView } from 'expo-glass-effect';
import { useContext, type ReactElement } from 'react';
import { useResolveClassNames } from 'uniwind';
import {
  readReducedTransparency,
  subscribeReducedTransparency,
} from './liquid-glass-accessibility.ios';
import { liquidGlassAvailable } from './liquid-glass-available.ios';
import {
  LiquidGlassPlatform,
  type GlassSurfaceProps,
  type LiquidGlassEnvironment,
} from './liquid-glass-platform';
import type { LiquidGlassProps } from './liquid-glass-props';
import { LiquidGlassRenderer } from './liquid-glass-renderer';
import { createTransparencyStore } from './transparency-store';

const nativePlatform: LiquidGlassEnvironment = liquidGlassAvailable
  ? {
      kind: 'native',
      GlassView: SystemGlassView,
      transparency: createTransparencyStore({
        read: readReducedTransparency,
        subscribe: subscribeReducedTransparency,
      }),
    }
  : { kind: 'fallback' };

function SystemGlassView({
  className,
  ...props
}: GlassSurfaceProps): ReactElement {
  const style = useResolveClassNames(className);

  return <GlassView {...props} style={style} />;
}

export function LiquidGlass(props: LiquidGlassProps): ReactElement {
  const platform = useContext(LiquidGlassPlatform) ?? nativePlatform;

  return <LiquidGlassRenderer {...props} platform={platform} />;
}
