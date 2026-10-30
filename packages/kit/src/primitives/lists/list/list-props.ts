import type { SpacingStep } from '@repo/contracts/kit-tokens';
import type { ReactNode, Ref } from 'react';
import type { ListSelection } from '../../../list-context';
import type { PhoneOverrides } from '../../../list-look';
import type { ListRef } from '../../../list-ref';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import type { SizeClassValue } from '../../../use-size-class/size-class-value';
import type { KitProps } from '../../kit-props';

// Kit-only: scrolling, padding, accessibility, content lanes and section grouping.
export type ListProps<Item> = KitProps<'List', string, ReactNode, Item> &
  Pick<
    ScrollFadeListProps<Item>,
    | 'refreshControl'
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
    | 'fitHeight'
    | 'testID'
    | 'depth'
    | 'inset'
    | 'initialScrollIndex'
    | 'initialScrollAtEnd'
    | 'alignItemsAtEnd'
    | 'anchoredEndSpace'
    | 'maintainScrollAtEnd'
    | 'maintainScrollAtEndThreshold'
    | 'maintainVisibleContentPosition'
    | 'onStartReached'
    | 'onStartReachedThreshold'
    | 'drawDistance'
    | 'stickyHeaderIndices'
    | 'keyboardDismissMode'
    | 'keyboardShouldPersistTaps'
  > & {
    ref?: Ref<ListRef>;
    header?: ReactNode;
    endContent?: ReactNode;
    startContent?: ReactNode;
    paddingBottom?: SizeClassValue<SpacingStep>;
    accessibilityRole?: 'list' | 'radiogroup';
    accessibilityLabel?: string;
    fit?: boolean;
    // Kit-only: what the phones draw in place of `appearance` and `padding`, so a caller never asks the platform.
    onPhones?: PhoneOverrides;
    // The header scrolls sideways and runs to the List's edges; it is drawn as a `ListHeaderRow`, which takes the gutter.
    headerBleeds?: boolean;
    padding?: SizeClassValue<SpacingStep>;
    paddingTop?: SizeClassValue<SpacingStep>;
    getSelectionId?: (item: Item) => string | undefined;
    getSectionKey?: (item: Item) => string | undefined;
  };

// Only a List of children in a column or lanes moves its rows: an `items` List's rows have no ids, and a grid or shelf flows its rows where no drag measures them.
export type MovesOrItems =
  | { items?: undefined; layout?: 'list' | 'lanes'; direction?: 'vertical' }
  | { onMove?: undefined };

// Kit-only: native selection and controlled section expansion.
export type ListSectionProps = KitProps<'List.Section'> &
  ListSelection & {
    count?: number;
    tone?: 'danger';
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
  };
