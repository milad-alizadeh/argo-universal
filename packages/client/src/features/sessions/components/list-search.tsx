import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { type TextInput, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useResolveClassNames } from 'uniwind';
import {
  bezierEasing,
  easingCurve,
  motionDuration,
  quarterTurnDegrees,
} from '#lib/generic/motion';
import { Input } from '#lib/generic/primitives/input';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import {
  Pressable,
  contentActionClass,
} from '../../../lib/generic/primitives/pressable';
import { Icon, iconPixels } from '../../../lib/generic/symbols/icon';
import { useWide } from '../../../lib/generic/use-wide';

const wideButtonSize = 32;
const narrowButtonSize = 44;
const fieldHeight = 32;
const fieldRadius = 6;
// Where the magnifier's centre settles inside the open field, from its left edge.
const fieldIconCentre = 17;
const titleShift = 8;
const closeMilliseconds = 220;
const closeIconStartScale = 0.6;

interface ListSearchProps {
  title: string;
  value: string;
  onChangeText: (value: string) => void;
}

export function ListSearch({
  title,
  value,
  onChangeText,
}: ListSearchProps): React.JSX.Element {
  const wide = useWide();
  const buttonSize = wide ? wideButtonSize : narrowButtonSize;
  const iconSize = iconPixels(wide ? 'sm' : 'md');
  const fieldIconSize = iconPixels('sm');
  const placeholderStyle = useResolveClassNames('text-muted-foreground');
  const [searching, setSearching] = useState(false);
  const [width, setWidth] = useState(buttonSize);
  const input = useRef<TextInput>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withTiming(searching ? 1 : 0, {
        duration: searching ? motionDuration.shellPane : closeMilliseconds,
        easing: bezierEasing(easingCurve.decelerate),
        reduceMotion: ReduceMotion.System,
      }),
    );
    if (!searching) {
      input.current?.blur();
      return;
    }
    const frame = requestAnimationFrame(() => input.current?.focus());
    return (): void => cancelAnimationFrame(frame);
  }, [progress, searching]);

  const titleStyle = useAnimatedStyle(
    () => ({
      opacity: 1 - progress.get(),
      transform: [{ translateX: -titleShift * progress.get() }],
    }),
    [progress],
  );
  const surfaceStyle = useAnimatedStyle(
    () => ({
      width: buttonSize + (width - buttonSize) * progress.get(),
      borderRadius:
        buttonSize / 2 + (fieldRadius - buttonSize / 2) * progress.get(),
      opacity: progress.get(),
    }),
    [buttonSize, width, progress],
  );
  const magnifierStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateX:
            -(width - buttonSize / 2 - fieldIconCentre) * progress.get(),
        },
        { scale: 1 + (fieldIconSize / iconSize - 1) * progress.get() },
      ],
    }),
    [buttonSize, iconSize, fieldIconSize, width, progress],
  );
  const closeStyle = useAnimatedStyle(
    () => ({
      opacity: progress.get(),
      transform: [
        { rotate: `${-quarterTurnDegrees * (1 - progress.get())}deg` },
        {
          scale:
            closeIconStartScale + (1 - closeIconStartScale) * progress.get(),
        },
      ],
    }),
    [progress],
  );
  function closeSearch(): void {
    setSearching(false);
    onChangeText('');
  }

  return (
    <View
      className="relative min-w-0 flex-1 justify-center"
      style={{ height: buttonSize }}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      <Animated.View
        pointerEvents="none"
        aria-hidden={searching}
        accessibilityElementsHidden={searching}
        style={titleStyle}
      >
        <Text
          semanticRole="heading"
          aria-level={1}
          role="title"
          className="pl-2"
          numberOfLines={1}
        >
          {title}
        </Text>
      </Animated.View>
      <Animated.View
        testID="list-search-surface"
        pointerEvents={searching ? 'auto' : 'none'}
        aria-hidden={!searching}
        accessibilityElementsHidden={!searching}
        importantForAccessibility={searching ? 'auto' : 'no-hide-descendants'}
        {...{ inert: !searching }}
        className="absolute right-0 h-8 justify-center overflow-hidden border border-input bg-background dark:bg-input/30"
        style={[{ top: (buttonSize - fieldHeight) / 2 }, surfaceStyle]}
      >
        <Input
          ref={input}
          editable={searching}
          accessibilityLabel={`Search ${title}`}
          placeholder={`Search ${title}`}
          placeholderTextColor={placeholderStyle.color}
          value={value}
          onChangeText={onChangeText}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Escape') closeSearch();
          }}
          className="h-8 sm:h-8 w-full rounded-none border-0 bg-transparent dark:bg-transparent pl-8 py-0 type-control ios:leading-none shadow-none focus-visible:ring-0"
          style={{ paddingRight: buttonSize, textAlignVertical: 'center' }}
        />
      </Animated.View>
      <Pressable
        accessibilityLabel={searching ? 'Close search' : `Search ${title}`}
        accessibilityState={{ expanded: searching }}
        onPress={searching ? closeSearch : (): void => setSearching(true)}
        role="button"
        className={contentActionClass({
          variant: 'ghost',
          className: cn(
            'absolute right-0 size-11 sm:size-11 p-0 wide:size-8 wide:sm:size-8',
            searching &&
              'web:hover:bg-transparent! web:dark:hover:bg-transparent!',
          ),
        })}
      >
        <Animated.View
          pointerEvents="none"
          className="absolute items-center justify-center"
          style={[{ width: buttonSize, height: buttonSize }, magnifierStyle]}
        >
          <Icon
            name="search"
            size={wide ? 'sm' : 'md'}
            className="text-foreground wide:text-muted-foreground"
          />
        </Animated.View>
        <Animated.View style={closeStyle}>
          <Icon
            name="close"
            size={wide ? 'sm' : 'md'}
            className="text-foreground wide:text-muted-foreground"
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}
