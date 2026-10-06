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
import { Text, TextClassContext } from '#primitives/text';
import { Icon } from './Icon';
import { ShimmerText } from './ShimmerText';

export interface FeedDisclosureProps {
  label: string;
  icon: PhosphorIcon;
  running?: boolean;
  failed?: boolean;
  initialOpen?: boolean;
  trailing?: string;
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
  const [hovered, setHovered] = useState(false);
  const title = trailing ? `${label} ${trailing}` : label;
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
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <TextClassContext.Provider value="select-none">
        <CollapsibleTrigger
          accessibilityLabel={label}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          className="min-h-5 flex-row items-center gap-1.5"
        >
          <Icon
            as={icon}
            className={cn(
              'shrink-0 text-muted-foreground',
              failed && 'text-destructive',
              hovered && 'text-foreground',
            )}
          />
          <View className="min-w-0 flex-1 flex-row items-center gap-1">
            {running ? (
              <ShimmerText
                text={title}
                emphasized={hovered}
                className="min-w-0 shrink text-sm leading-5 text-foreground"
              />
            ) : (
              <Text
                numberOfLines={1}
                selectable={false}
                className={cn(
                  'min-w-0 shrink text-sm leading-5 text-muted-foreground',
                  hovered && 'text-foreground',
                )}
              >
                {title}
              </Text>
            )}
            <Animated.View style={style} className="shrink-0">
              <Icon
                size="sm"
                as={CaretRightIcon}
                className={cn(
                  'text-muted-foreground',
                  hovered && 'text-foreground',
                )}
              />
            </Animated.View>
          </View>
        </CollapsibleTrigger>
      </TextClassContext.Provider>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
