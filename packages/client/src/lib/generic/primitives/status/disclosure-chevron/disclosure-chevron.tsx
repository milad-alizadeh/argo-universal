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

function ChevronGlyph(props: DisclosureChevronProps): React.JSX.Element {
  return (
    <Icon
      role={props.role ?? 'body'}
      name="chevron-right"
      fitArtwork={props.fitArtwork}
      weight={props.weight}
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
  const rotation = useDerivedValue(
    () =>
      withTiming(open ? quarterTurnDegrees : 0, {
        duration: motionDuration.enter,
        reduceMotion: ReduceMotion.System,
      }),
    [open],
  );

  return useAnimatedStyle<ViewStyle>(
    () => ({ transform: [{ rotate: `${rotation.value}deg` }] }),
    [rotation],
  );
}
