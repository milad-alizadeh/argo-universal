import type * as React from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '#primitives/content/icon';
import { motionDuration, quarterTurnDegrees } from '../../../motion';
import { useIconBox } from '../../../symbols/icon-size';
import { cn } from '../../../utils';
import type { DisclosureChevronProps } from './disclosure-chevron-props';

export function DisclosureChevron(
  props: DisclosureChevronProps,
): React.JSX.Element {
  const chevron = <ChevronGlyph {...props} />;

  if (props.open === undefined) return chevron;

  return <Turning open={props.open}>{chevron}</Turning>;
}

// iOS draws its SF chevron at half the icon beside it.
export const halfScale = 0.5;

type ChevronIconProps = DisclosureChevronProps & {
  size: NonNullable<DisclosureChevronProps['size']>;
};

/*
 * A chevron takes the size of the icon beside it. Material's fills about half its box; SF's fills most of it, so the
 * Mac draws SF chevrons smaller (the glyph drawing) and iOS draws this one at half the icon.
 */
function ChevronGlyph(props: DisclosureChevronProps): React.JSX.Element {
  const size = props.size ?? 'md';

  if (Platform.OS === 'ios') return <HalfChevron {...props} size={size} />;

  return <ChevronIcon {...props} size={size} />;
}

// The chevron keeps the box of the icon beside it, so rows and headers lay out as they do with Material.
function HalfChevron(props: ChevronIconProps): React.JSX.Element {
  return (
    <View
      style={useIconBox(props.size)}
      className="items-center justify-center"
    >
      <View style={{ transform: [{ scale: halfScale }] }}>
        <ChevronIcon {...props} />
      </View>
    </View>
  );
}

function ChevronIcon(props: ChevronIconProps): React.JSX.Element {
  return (
    <Icon
      size={props.size}
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
