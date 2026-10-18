import type { StackGap } from '@repo/contracts/kit-tokens';
import type { ReactNode } from 'react';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import type { SizeClassValue } from '../../../use-size-class/size-class-value';
import type { KitProps } from '../../kit-props';

// Kit-only: scrolling, padding and section grouping.
export type ListProps<Item> = KitProps<'List', string, ReactNode, Item> &
  Pick<
    ScrollFadeListProps<Item>,
    | 'keyExtractor'
    | 'getItemType'
    | 'extraData'
    | 'recycleItems'
    | 'onEndReached'
    | 'onEndReachedThreshold'
    | 'onScroll'
    | 'estimatedItemSize'
    | 'contentInsetAdjustmentBehavior'
    | 'edges'
    | 'maxHeight'
    | 'testID'
    | 'ref'
  > & {
    padding?: SizeClassValue<StackGap>;
    paddingTop?: SizeClassValue<StackGap>;
    getSectionKey?: (item: Item) => string | undefined;
  };

// Kit-only: controlled section expansion.
export type ListSectionProps = KitProps<'List.Section'> & {
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};
