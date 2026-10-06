import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CircleNotchIcon } from 'phosphor-react-native/src/icons/CircleNotch';
import { type ReactNode, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '#lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#primitives/collapsible';
import { Text } from '#primitives/text';
import { Icon } from './Icon';

export interface FeedDisclosureProps {
  label: string;
  icon: PhosphorIcon;
  running?: boolean;
  failed?: boolean;
  initialOpen?: boolean;
  trailing?: ReactNode;
  preview?: ReactNode;
  children: ReactNode;
}

export function FeedDisclosure({
  label,
  icon,
  running = false,
  failed = false,
  initialOpen = false,
  trailing,
  preview,
  children,
}: FeedDisclosureProps) {
  const [open, setOpen] = useState(initialOpen);
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = running
      ? withRepeat(
          withTiming(360, { duration: 750, easing: Easing.linear }),
          -1,
        )
      : 0;
    return () => cancelAnimation(rotation);
  }, [running, rotation]);
  const style = useAnimatedStyle(
    () => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }),
    [rotation],
  );
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full gap-2">
      <CollapsibleTrigger
        accessibilityLabel={label}
        className="min-h-5 flex-row items-center gap-1.5"
      >
        <Animated.View
          role={running ? 'progressbar' : undefined}
          accessibilityLabel={running ? label : undefined}
          style={running ? style : undefined}
          className="size-4 shrink-0"
        >
          <Icon
            as={running ? CircleNotchIcon : icon}
            className={cn(
              'size-4 text-muted-foreground',
              running && 'text-foreground',
              failed && 'text-destructive',
            )}
          />
        </Animated.View>
        <View className="min-w-0 flex-1 flex-row items-center gap-1">
          <Text
            numberOfLines={1}
            className={cn(
              'min-w-0 shrink text-sm leading-5 text-muted-foreground',
              running && 'text-foreground',
            )}
          >
            {label}
          </Text>
          {trailing}
          <Icon
            as={open ? CaretDownIcon : CaretRightIcon}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </View>
      </CollapsibleTrigger>
      {!open && preview}
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
