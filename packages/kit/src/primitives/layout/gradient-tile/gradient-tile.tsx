import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { useSizeClass } from '#kit/use-size-class/use-size-class';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { useSkeletonLoading } from '#primitives/status/skeleton';
import { Gradient } from '../../controls/fader/fader-gradient';
import { inkOver } from '../../controls/fader/fader-ink';
import type { KitProps } from '../../kit-props';

type Props = KitProps<'GradientTile'>;

const heights = { compact: 112, expanded: 104 };

export function GradientTile({
  title,
  fill,
  selected,
  onPress,
}: Props): ReactElement {
  const height =
    useSizeClass() === 'compact' ? heights.compact : heights.expanded;

  const loading = useSkeletonLoading();

  const colours = !loading && fill?.length ? fill : null;

  const ink = colours ? inkOver(colours) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      className={cn(
        'overflow-hidden rounded-2xl bg-muted border-2 border-transparent p-3 active:opacity-80',
        selected && !loading && 'border-foreground',
      )}
      style={{ height }}
      onPress={onPress}
    >
      {colours ? (
        <View pointerEvents="none" className="absolute inset-0">
          <Gradient orientation="horizontal" fill={colours} />
        </View>
      ) : null}
      <Text
        role="row"
        className={selected && !loading ? 'pe-7' : undefined}
        style={ink ? { color: ink === 'dark' ? 'black' : 'white' } : undefined}
      >
        {title}
      </Text>
      {selected && !loading && (
        <View className="absolute top-3 end-3 rounded-full bg-card p-1">
          <Icon name="check" size="sm" />
        </View>
      )}
    </Pressable>
  );
}
