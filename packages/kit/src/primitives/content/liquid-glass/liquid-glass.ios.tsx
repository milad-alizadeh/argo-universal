import { GlassView } from 'expo-glass-effect';
import { useContext, type ReactElement } from 'react';
import {
  readReducedTransparency,
  subscribeReducedTransparency,
} from './liquid-glass-accessibility.ios';
import { liquidGlassAvailable } from './liquid-glass-available.ios';
import {
  LiquidGlassPlatform,
  type LiquidGlassEnvironment,
} from './liquid-glass-platform';
import type { LiquidGlassProps } from './liquid-glass-props';
import { LiquidGlassRenderer } from './liquid-glass-renderer';
import { createTransparencyStore } from './transparency-store';

const nativePlatform: LiquidGlassEnvironment = liquidGlassAvailable
  ? {
      kind: 'native',
      GlassView,
      transparency: createTransparencyStore({
        read: readReducedTransparency,
        subscribe: subscribeReducedTransparency,
      }),
    }
  : { kind: 'fallback' };

export function LiquidGlass(props: LiquidGlassProps): ReactElement {
  const platform = useContext(LiquidGlassPlatform) ?? nativePlatform;

  return <LiquidGlassRenderer {...props} platform={platform} />;
}
