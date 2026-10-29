import type { ReactElement } from 'react';
import { useContext, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { cn } from '#kit/utils';
import { FallbackSurface } from './liquid-glass-fallback';
import {
  floatingGlassFallback,
  glassCornerClass,
  LiquidGlassMaterial,
} from './liquid-glass-material';
import type {
  LiquidGlassEnvironment,
  NativeGlassPlatform,
} from './liquid-glass-platform';
import type { LiquidGlassProps } from './liquid-glass-props';

interface RendererProps extends LiquidGlassProps {
  platform: LiquidGlassEnvironment;
}

const opaquePreference = {
  subscribe: (): (() => void) => () => {},
  snapshot: (): boolean => true,
};

function useReducedTransparency(platform: LiquidGlassEnvironment): boolean {
  const store =
    platform.kind === 'native' ? platform.transparency : opaquePreference;

  return useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    opaquePreference.snapshot,
  );
}

export function LiquidGlassRenderer(props: RendererProps): ReactElement {
  const inherited = useContext(LiquidGlassMaterial);
  const reduced = useReducedTransparency(props.platform);

  if (props.platform.kind === 'fallback') return <FallbackSurface {...props} />;

  if (inheritsMaterial(props, inherited))
    return <View className={glassLayout(props)}>{props.children}</View>;

  return (
    <SystemGlass
      {...props}
      platform={props.platform}
      withoutEffect={withoutEffect(props, reduced)}
    />
  );
}

const withoutEffect = (props: LiquidGlassProps, reduced: boolean): boolean =>
  props.glass === false || reduced;

const inheritsMaterial = (
  props: LiquidGlassProps,
  inherited: boolean,
): boolean => Boolean(props.inherit) && inherited && props.glass !== false;

const glassLayout = ({ className, corners }: LiquidGlassProps): string =>
  cn(className, glassCornerClass[corners]);

function SystemGlass(
  props: LiquidGlassProps & {
    platform: NativeGlassPlatform;
    withoutEffect: boolean;
  },
): ReactElement {
  const GlassView = props.platform.GlassView;
  const look = useGlassViewProps(props);

  return (
    <GlassView {...look}>
      <LiquidGlassMaterial value={true}>{props.children}</LiquidGlassMaterial>
    </GlassView>
  );
}

type SystemGlassProps = LiquidGlassProps & { withoutEffect: boolean };

const glassSurface = (props: SystemGlassProps): string =>
  props.withoutEffect ? (props.fallbackClassName ?? floatingGlassFallback) : '';

const interactiveEffect = (props: SystemGlassProps): boolean =>
  Boolean(props.interactive) && !props.withoutEffect;

function useGlassViewProps(
  props: SystemGlassProps,
): React.ComponentProps<NativeGlassPlatform['GlassView']> {
  const { colorScheme } = useNativeTheme();

  return {
    glassEffectStyle: props.withoutEffect ? 'none' : 'regular',
    isInteractive: interactiveEffect(props),
    colorScheme,
    className: cn(glassLayout(props), glassSurface(props)),
  };
}
