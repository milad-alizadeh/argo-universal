import type { GlassViewProps } from 'expo-glass-effect';
import type { ReactElement } from 'react';
import type {
  GlassSurfaceProps,
  NativeGlassPlatform,
} from './liquid-glass-platform';
import {
  createTransparencyStore,
  type TransparencySource,
} from './transparency-store';

export const nativeMaterialLabel = 'System glass regular light';

export const opaqueMaterialLabel = 'System glass none light';

function glassStyle(style: GlassViewProps['glassEffectStyle']): string {
  if (typeof style === 'string') return style;

  return style ? style.style : 'none';
}

function NativeGlassPort(props: GlassSurfaceProps): ReactElement {
  const label = `System glass ${glassStyle(props.glassEffectStyle)} ${props.colorScheme ?? 'auto'}`;

  return (
    <div role="group" aria-label={label} className={props.className}>
      {props.children}
    </div>
  );
}

interface Preferences {
  reduced: boolean;
  listeners: Set<(reduced: boolean) => void>;
}

interface NativeGlassFixture {
  platform: NativeGlassPlatform;
  change: (reduced: boolean) => void;
}

export function nativeGlassFixture(initialReduced = false): NativeGlassFixture {
  const state: Preferences = { reduced: initialReduced, listeners: new Set() };
  const source = preferenceSource(state);

  return {
    platform: {
      kind: 'native',
      GlassView: NativeGlassPort,
      transparency: createTransparencyStore(source),
    },
    change: (value): void => change(state, value),
  };
}

function preferenceSource(state: Preferences): TransparencySource {
  return {
    read: async (): Promise<boolean> => state.reduced,
    subscribe: (listener): (() => void) => subscribe(state, listener),
  };
}

function subscribe(
  state: Preferences,
  listener: (value: boolean) => void,
): () => void {
  state.listeners.add(listener);

  return () => {
    state.listeners.delete(listener);
  };
}

function change(state: Preferences, value: boolean): void {
  state.reduced = value;

  for (const listener of state.listeners) listener(value);
}
