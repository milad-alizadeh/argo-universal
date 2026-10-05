import { MagnifyingGlassIcon, XIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { type TextInput, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Input } from '#primitives/input';
import { Text } from '#primitives/text';
import { useWide } from '../navigation/use-wide';
import { Icon } from './Icon';

interface ListSearchProps {
  title: string;
  value: string;
  onChangeText: (value: string) => void;
}

export function ListSearch({ title, value, onChangeText }: ListSearchProps) {
  const wide = useWide();
  const buttonSize = wide ? 32 : 44;
  const iconSize = wide ? 16 : 22;
  const [searching, setSearching] = useState(false);
  const [width, setWidth] = useState(buttonSize);
  const input = useRef<TextInput>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(searching ? 1 : 0, {
      duration: searching ? 280 : 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      reduceMotion: ReduceMotion.System,
    });
    if (!searching) {
      input.current?.blur();
      return;
    }
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [progress, searching]);

  const titleStyle = useAnimatedStyle(
    () => ({
      opacity: 1 - progress.value,
      transform: [{ translateX: -8 * progress.value }],
    }),
    [progress],
  );
  const surfaceStyle = useAnimatedStyle(
    () => ({
      width: buttonSize + (width - buttonSize) * progress.value,
      borderRadius: buttonSize / 2 + (6 - buttonSize / 2) * progress.value,
      opacity: progress.value,
    }),
    [buttonSize, width, progress],
  );
  const magnifierStyle = useAnimatedStyle(
    () => ({
      transform: [
        { translateX: -(width - buttonSize / 2 - 17) * progress.value },
        { scale: 1 + (14 / iconSize - 1) * progress.value },
      ],
    }),
    [buttonSize, iconSize, width, progress],
  );
  const closeStyle = useAnimatedStyle(
    () => ({
      opacity: progress.value,
      transform: [
        { rotate: `${-90 * (1 - progress.value)}deg` },
        { scale: 0.6 + 0.4 * progress.value },
      ],
    }),
    [progress],
  );
  function closeSearch() {
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
          role="heading"
          aria-level={1}
          className="pl-2 text-xl wide:text-base font-semibold"
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
        style={surfaceStyle}
      >
        <Input
          ref={input}
          editable={searching}
          accessibilityLabel={`Search ${title}`}
          placeholder={`Search ${title}`}
          value={value}
          onChangeText={onChangeText}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Escape') closeSearch();
          }}
          className="h-8 sm:h-8 w-full rounded-none border-0 bg-transparent dark:bg-transparent pl-8 text-sm shadow-none focus-visible:ring-0"
          style={{ paddingRight: buttonSize }}
        />
      </Animated.View>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute right-0 size-11 sm:size-11 wide:size-8 wide:sm:size-8',
          searching &&
            'web:hover:bg-transparent! web:dark:hover:bg-transparent!',
        )}
        accessibilityLabel={searching ? 'Close search' : `Search ${title}`}
        accessibilityState={{ expanded: searching }}
        onPress={searching ? closeSearch : () => setSearching(true)}
      >
        <Animated.View
          pointerEvents="none"
          className="absolute items-center justify-center"
          style={[{ width: buttonSize, height: buttonSize }, magnifierStyle]}
        >
          <Icon
            as={MagnifyingGlassIcon}
            className="size-5.5 wide:size-4 text-foreground wide:text-muted-foreground"
          />
        </Animated.View>
        <Animated.View style={closeStyle}>
          <Icon
            as={XIcon}
            className="size-5.5 wide:size-4 text-foreground wide:text-muted-foreground"
          />
        </Animated.View>
      </Button>
    </View>
  );
}
