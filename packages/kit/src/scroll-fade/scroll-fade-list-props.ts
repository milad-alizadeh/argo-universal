import type { LegendListProps } from '@legendapp/list/react-native';
import type { Ref } from 'react';
import type { ListRef } from '../list-ref';
import type { SizeClassValue } from '../use-size-class/size-class-value';
import { useSizeClassValue } from '../use-size-class/use-size-class-value';
import type { ScrollFadeOptions } from './scroll-fade-options';

export type ScrollFadeListProps<T> = Omit<
  LegendListProps<T>,
  'contentContainerStyle'
> &
  ScrollFadeOptions & {
    // Receives the LegendList: typed as a List's ref, which a board of lanes also fills.
    ref?: Ref<ListRef>;
    // One inset, or one per size class: a phone list insets its rows where a wide pane does not.
    contentContainerStyle?: SizeClassValue<
      LegendListProps<T>['contentContainerStyle']
    >;
    // Grows with its content up to this height, then scrolls; without it the list fills its parent. One per size class where they differ.
    maxHeight?: SizeClassValue<number>;
    /*
     * The same cap, for a list its caller never held to a height: the most room it was offered where
     * nothing else bounds it. A parent that does bound it wins, which a `maxHeight` never gives up.
     */
    fitHeight?: SizeClassValue<number>;
  };

// The list's props with its content inset resolved for the window's size class.
export function useSizeClassListProps<T>({
  contentContainerStyle,
  ...props
}: Omit<
  ScrollFadeListProps<T>,
  'ref' | 'maxHeight' | 'fitHeight' | 'refScrollView'
>): LegendListProps<T> {
  return {
    ...props,
    contentContainerStyle: useSizeClassValue(contentContainerStyle),
  };
}
