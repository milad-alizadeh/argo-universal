import type { SessionInfo } from '@repo/contracts';
import { fullTurnDegrees } from '@repo/kit/motion';
import { useIconBox } from '@repo/kit/symbols/icon-role';
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
import { AgentLogo } from '#features/agents';

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
  const logoStyle = useLogoRotation(props.status);

  return (
    <Animated.View style={[useIconBox('body'), logoStyle]}>
      <AgentLogo
        logo={props.logo}
        label="Agent"
        role="body"
        testID="session-logo"
      />
    </Animated.View>
  );
}
