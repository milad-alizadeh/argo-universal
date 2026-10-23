import type * as React from 'react';
import { Platform, type ViewStyle } from 'react-native';
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

// Android's Material chevron fills about half its box where the SF Symbol fills most of it, so Android draws one step up to match.
const sizes = {
  xs: Platform.OS === 'android' ? 'sm' : 'xs',
  sm: Platform.OS === 'android' ? 'md' : 'sm',
} as const;

/*
 * Every row's chevron is sm; a collapsible's header passes xs, one size smaller.
 */
function ChevronGlyph(props: DisclosureChevronProps): React.JSX.Element {
  return (
    <Icon
      size={sizes[props.size ?? 'sm']}
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
