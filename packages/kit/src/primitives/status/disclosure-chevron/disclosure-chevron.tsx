import type * as React from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '#primitives/content/icon';
import { motionDuration, quarterTurnDegrees } from '../../../motion';
import { cn } from '../../../utils';
import type { DisclosureChevronProps } from './disclosure-chevron-props';

export function DisclosureChevron(
  props: DisclosureChevronProps,
): React.JSX.Element {
  const chevron = <ChevronGlyph {...props} />;

  if (props.open === undefined) return chevron;

  return <Turning open={props.open}>{chevron}</Turning>;
}

/*
 * One size, with no say in it from the caller: every chevron in the app is the `chevron` role, so a
 * collapsible's chevron and a row's are the same glyph at the same size wherever they sit.
 */
function ChevronGlyph(props: DisclosureChevronProps): React.JSX.Element {
  return (
    <Icon
      role="chevron"
      name="chevron-right"
      className={cn('text-muted-foreground', props.className)}
    />
  );
}

function Turning({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Animated.View style={useTurn(open)} className="shrink-0">
      {children}
    </Animated.View>
  );
}

type TurnStyle = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

function useTurn(open: boolean): TurnStyle {
  const rotation = useDerivedValue(() =>
    withTiming(open ? quarterTurnDegrees : 0, {
      duration: motionDuration.enter,
      reduceMotion: ReduceMotion.System,
    }),
  );

  return useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
}
