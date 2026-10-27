import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
} from '@legendapp/list/react-native';
import {
  AnimatedLegendList,
  type AnimatedLegendListProps,
} from '@legendapp/list/reanimated';
import { type ReactNode, type Ref, useCallback } from 'react';
import { assignRef } from './legend-scroll-ref';

type ListProps<T> = LegendListProps<T> & { ref: Ref<LegendListRef> };

type LegendScrollRef = LegendListProps<unknown>['refScrollView'];

type LegendScrollTarget = Parameters<
  Extract<LegendScrollRef, (instance: never) => void>
>[0];

type AnimatedScrollRef = AnimatedLegendListProps<unknown>['refScrollView'];

type AnimatedScrollTarget = Parameters<
  Extract<AnimatedScrollRef, (instance: never) => void>
>[0];

// Both builds hand out the same scroll view; Legend List types the two refs apart.
function isLegendScroll(
  instance: AnimatedScrollTarget,
): instance is AnimatedScrollTarget & LegendScrollTarget {
  return typeof instance === 'object';
}

function useAnimatedScrollRef(user: LegendScrollRef): AnimatedScrollRef {
  return useCallback(
    (instance: AnimatedScrollTarget) => {
      if (isLegendScroll(instance)) assignRef(user, instance);
    },
    [user],
  );
}

function StickyLegendList<T>({
  refScrollView,
  ...props
}: ListProps<T>): ReactNode {
  return (
    <AnimatedLegendList
      {...props}
      refScrollView={useAnimatedScrollRef(refScrollView)}
    />
  );
}

/*
 * Native measures rows by layout, which an ancestor's transform does not change.
 *
 * Legend List's own sticky headers follow the scroll through a native-driven interpolation that is built again
 * when a row above or below a header grows or shrinks, and the native side only evaluates it on the next
 * scroll event: folding a file leaves headers at their old offsets, blank bands and all, until the finger
 * moves. Its Reanimated build positions them in a worklet that runs again when the geometry changes.
 */
export function MeasuredLegendList<T>(props: ListProps<T>): ReactNode {
  return props.stickyHeaderIndices?.length ? (
    <StickyLegendList {...props} />
  ) : (
    <LegendList {...props} />
  );
}
