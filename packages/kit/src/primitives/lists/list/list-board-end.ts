import { useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { ListProps } from './list-props';

const noEnd = (): void => {};

// LegendList's own default `onEndReachedThreshold`.
const halfAWidth = 0.5;

type OnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

const endDistance = ({
  contentOffset,
  contentSize,
  layoutMeasurement,
}: NativeScrollEvent): number =>
  contentSize.width - contentOffset.x - layoutMeasurement.width;

/*
 * A board of lanes scrolls sideways on a ScrollView, which has no `onEndReached` of its own: this calls the List's once
 * the board scrolls within `threshold` of its end, in visible widths as LegendList counts it, and again only after the
 * board has scrolled away from its end.
 */
export function useBoardEnd({
  onEndReached,
  onEndReachedThreshold,
}: Pick<ListProps<never>, 'onEndReached' | 'onEndReachedThreshold'>): OnScroll {
  const near = useRef(false);
  const ended = onEndReached ?? noEnd;
  const threshold = onEndReachedThreshold ?? halfAWidth;

  return ({ nativeEvent }) => {
    const distanceFromEnd = endDistance(nativeEvent);

    const reached =
      distanceFromEnd <= threshold * nativeEvent.layoutMeasurement.width;

    if (reached && !near.current) ended({ distanceFromEnd });

    near.current = reached;
  };
}
