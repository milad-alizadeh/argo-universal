import type * as React from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { motionDuration, quarterTurnDegrees } from '../../../motion';
import { Icon } from '../../../symbols/icon';
import type { IconRole } from '../../../symbols/icon-role';
import { cn } from '../../../utils';

interface DisclosureChevronProps {
  // Turns the chevron down when its section is open; leave it out for a row that opens another page.
  open?: boolean;
  className?: string;
  iconRole?: IconRole;
}

export function DisclosureChevron({
  open,
  className,
  iconRole,
}: DisclosureChevronProps): React.JSX.Element {
  const chevron = <ChevronGlyph className={className} iconRole={iconRole} />;
  return open === undefined ? (
    chevron
  ) : (
    <Turning open={open}>{chevron}</Turning>
  );
}

function ChevronGlyph({
  className,
  iconRole = 'body',
}: Pick<DisclosureChevronProps, 'className' | 'iconRole'>): React.JSX.Element {
  return (
    <Icon
      role={iconRole}
      name="chevron-right"
      className={cn('text-muted-foreground', className)}
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
