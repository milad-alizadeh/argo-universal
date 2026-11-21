import type { ReactElement } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { useSkeletonLoading } from '#primitives/status/skeleton';
import { useSizeClass } from '../../../use-size-class/use-size-class';
import { isRightToLeft } from '../../controls/fader/fader-direction';
import { Gradient } from '../../controls/fader/fader-gradient';
import { inkOver } from '../../controls/fader/fader-ink';
import type { KitProps } from '../../kit-props';

type Props = KitProps<'GradientTile'>;

const heights = { compact: 112, expanded: 104 };

// Native draws the gradient in the tile’s background layer, using its final bounds and corner radius.
function nativeFill(colours: string[] | null): ViewStyle | undefined {
  if (Platform.OS === 'web' || !colours) return undefined;

  if (colours.length === 1) return { backgroundColor: colours[0] };

  const direction = isRightToLeft() ? 'to left' : 'to right';

  return {
    experimental_backgroundImage: `linear-gradient(${direction}, ${colours.join(', ')})`,
  };
}

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
      className="overflow-hidden rounded-2xl bg-muted p-3 active:opacity-80"
      style={{ height, ...nativeFill(colours) }}
      onPress={onPress}
    >
      {Platform.OS === 'web' && colours ? (
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
        <>
          <View
            pointerEvents="none"
            className="absolute inset-0 rounded-2xl border-2 border-foreground"
          />
          <View className="absolute top-3 end-3 rounded-full bg-card p-1">
            <Icon name="check" size="sm" />
          </View>
        </>
      )}
    </Pressable>
  );
}
