import { motionDuration } from '@repo/kit/motion';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { boxless } from './boxless';
import { regionLabel } from './draft-region-label';
import { DraftFramedContext } from './draft-seam';

const fadeIn = FadeIn.duration(motionDuration.enter);

const fadeOut = FadeOut.duration(motionDuration.frame);

// A node's own new drawing fades in, then its wrapper stays, so a later draw of the node does not draw its subtree again.
export function DraftFade({
  reduced,
  children,
}: {
  reduced: boolean;
  children: ReactNode;
}): ReactElement {
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFaded(true), motionDuration.enter);

    return (): void => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      testID="draft-fade"
      entering={reduced ? undefined : fadeIn}
      style={reduced || faded ? boxless : undefined}
    >
      {children}
    </Animated.View>
  );
}

type FrameProps = {
  region: string;
  active: boolean;
  reduced: boolean;
  children: ReactNode;
};

export function DraftFrame({
  region,
  active,
  reduced,
  children,
}: FrameProps): ReactElement {
  return (
    <View
      testID={`draft-region-${region}`}
      style={active ? undefined : boxless}
    >
      <DraftFramedContext value={active}>{children}</DraftFramedContext>
      {active ? (
        <Animated.View
          pointerEvents="none"
          testID={`draft-frame-${region}`}
          entering={reduced ? undefined : fadeIn}
          exiting={reduced ? undefined : fadeOut}
          className="absolute -inset-1 rounded-2xl border-2 border-dashed border-info"
        >
          <View className="absolute bottom-full left-3 rounded-md bg-info px-1.5">
            <Text className="type-badge text-primary-foreground">
              {regionLabel(region)}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
