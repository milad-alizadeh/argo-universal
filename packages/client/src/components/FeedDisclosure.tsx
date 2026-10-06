import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
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
import { ShimmerText } from './ShimmerText';

export interface FeedDisclosureProps {
  label: string;
  icon: PhosphorIcon;
  running?: boolean;
  failed?: boolean;
  initialOpen?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
}

export function FeedDisclosure({
  label,
  icon,
  running = false,
  failed = false,
  initialOpen = false,
  trailing,
  children,
}: FeedDisclosureProps) {
  const [open, setOpen] = useState(initialOpen);
  const rotation = useDerivedValue(
    () =>
      withTiming(open ? 90 : 0, {
        duration: 200,
        reduceMotion: ReduceMotion.System,
      }),
    [open],
  );
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
        <View className="size-4 shrink-0">
          <Icon
            as={icon}
            className={cn(
              'size-4 text-muted-foreground',
              failed && 'text-destructive',
            )}
          />
        </View>
        <View className="min-w-0 flex-1 flex-row items-center gap-1">
          {running ? (
            <ShimmerText
              text={label}
              className="min-w-0 shrink text-sm leading-5 text-foreground"
            />
          ) : (
            <Text
              numberOfLines={1}
              className="min-w-0 shrink text-sm leading-5 text-muted-foreground"
            >
              {label}
            </Text>
          )}
          {trailing}
          <Animated.View style={style} className="size-3.5 shrink-0">
            <Icon
              as={CaretRightIcon}
              className="size-3.5 text-muted-foreground"
            />
          </Animated.View>
        </View>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
