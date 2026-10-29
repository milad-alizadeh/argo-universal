import type { GlassViewProps } from 'expo-glass-effect';
import { createContext, type ComponentType } from 'react';
import type { TransparencyStore } from './transparency-store';

export interface GlassSurfaceProps extends GlassViewProps {
  className: string;
}

export interface NativeGlassPlatform {
  kind: 'native';
  GlassView: ComponentType<GlassSurfaceProps>;
  transparency: TransparencyStore;
}

export type LiquidGlassEnvironment = NativeGlassPlatform | { kind: 'fallback' };

export const fallbackGlassPlatform = { kind: 'fallback' } as const;

export const LiquidGlassPlatform = createContext<
  LiquidGlassEnvironment | undefined
>(undefined);
