import { useContext, type ReactElement } from 'react';
import {
  fallbackGlassPlatform,
  LiquidGlassPlatform,
} from './liquid-glass-platform';
import type { LiquidGlassProps } from './liquid-glass-props';
import { LiquidGlassRenderer } from './liquid-glass-renderer';

export function LiquidGlass(props: LiquidGlassProps): ReactElement {
  const platform = useContext(LiquidGlassPlatform) ?? fallbackGlassPlatform;

  return <LiquidGlassRenderer {...props} platform={platform} />;
}
