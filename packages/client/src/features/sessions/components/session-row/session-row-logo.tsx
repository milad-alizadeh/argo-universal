import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { fullTurnDegrees } from '#lib/generic/motion';
import { useIconBox } from '../../../../lib/generic/symbols/icon-role';

const logoTurnMilliseconds = 3000;

function spinForever(): number {
  return withRepeat(
    withTiming(fullTurnDegrees, {
      duration: logoTurnMilliseconds,
      easing: Easing.linear,
    }),
    -1,
  );
}

function useLogoRotation(
  status: SessionInfo['status'],
): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const logoRotation = useSharedValue(0);
  useEffect(() => {
    logoRotation.set(status === 'running' ? spinForever() : 0);
    return (): void => cancelAnimation(logoRotation);
  }, [status, logoRotation]);
  return useAnimatedStyle(
    () => ({ transform: [{ rotate: `${logoRotation.get()}deg` }] }),
    [logoRotation],
  );
}

interface SessionLogoProps {
  logo: string;
  status: SessionInfo['status'];
}

export function SessionLogo(props: SessionLogoProps): React.JSX.Element {
  const { color } = useResolveClassNames('text-foreground');
  const logoStyle = useLogoRotation(props.status);
  return (
    <Animated.View style={[useIconBox('mark'), logoStyle]}>
      <SvgXml
        testID="session-logo"
        xml={props.logo}
        width="100%"
        height="100%"
        color={color}
      />
    </Animated.View>
  );
}
