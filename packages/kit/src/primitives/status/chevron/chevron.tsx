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
import { iosChevronScale } from '../../../symbols/chevron-scale';
import { useIconBox } from '../../../symbols/icon-size';
import { cn } from '../../../utils';
import type { ChevronProps } from './chevron-props';

const iconNames = {
  up: 'chevron-up',
  down: 'chevron-down',
  right: 'chevron-right',
} as const;

// Every chevron in Argo is drawn here, so its size and its per-platform scale have one owner.
export function Chevron(props: ChevronProps): React.JSX.Element {
  const chevron = <ChevronGlyph {...props} />;

  if (props.open === undefined) return chevron;

  return <Turning open={props.open}>{chevron}</Turning>;
}

/*
 * A chevron takes the size of the icon beside it. Material's fills about half its box; SF's fills most of it, so the
 * Mac draws SF chevrons smaller (the glyph drawing) and iOS draws this one at half the icon.
 */
function ChevronGlyph(props: ChevronProps): React.JSX.Element {
  if (Platform.OS === 'ios') return <HalfChevron {...props} />;

  return <ChevronIcon {...props} />;
}

// The chevron keeps the box of the icon beside it, so rows and headers lay out as they do with Material.
function HalfChevron(props: ChevronProps): React.JSX.Element {
  return (
    <View
      style={useIconBox(props.beside ?? 'sm')}
      className="items-center justify-center"
    >
      <View style={{ transform: [{ scale: iosChevronScale }] }}>
        <ChevronIcon {...props} />
      </View>
    </View>
  );
}

function ChevronIcon(props: ChevronProps): React.JSX.Element {
  return (
    <Icon
      size={props.beside ?? 'sm'}
      name={iconNames[props.direction]}
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
