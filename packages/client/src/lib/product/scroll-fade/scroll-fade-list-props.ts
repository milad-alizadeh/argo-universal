import type {
  LegendListProps,
  LegendListRef,
} from '@legendapp/list/react-native';
import type { Ref } from 'react';
import type { SizeClassValue } from '../../generic/use-size-class/size-class-value';
import { useSizeClassValue } from '../../generic/use-size-class/use-size-class-value';
import type { ScrollFadeOptions } from './scroll-fade-options';

export type ScrollFadeListProps<T> = Omit<
  LegendListProps<T>,
  'contentContainerStyle'
> &
  ScrollFadeOptions & {
    ref?: Ref<LegendListRef>;
    // One inset, or one per size class: a phone list insets its rows where a wide pane does not.
    contentContainerStyle?: SizeClassValue<
      LegendListProps<T>['contentContainerStyle']
    >;
    // Grows with its content up to this height, then scrolls; without it the list fills its parent.
    maxHeight?: number;
  };

// The list with its content inset resolved for the window's size class.
export function useSizeClassInset<T>({
  contentContainerStyle,
  ...props
}: Omit<
  ScrollFadeListProps<T>,
  'ref' | 'maxHeight' | 'refScrollView'
>): LegendListProps<T> {
  return {
    ...props,
    contentContainerStyle: useSizeClassValue(contentContainerStyle),
  };
}
