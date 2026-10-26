import type { SpacingStep } from '@repo/contracts/kit-tokens';
import type { ReactNode } from 'react';
import type { ListSelection } from '../../../list-context';
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
    | 'testID'
    | 'ref'
    | 'depth'
    | 'inset'
    | 'initialScrollIndex'
    | 'initialScrollAtEnd'
    | 'alignItemsAtEnd'
    | 'maintainScrollAtEnd'
    | 'maintainScrollAtEndThreshold'
    | 'maintainVisibleContentPosition'
    | 'onStartReached'
    | 'onStartReachedThreshold'
    | 'drawDistance'
    | 'keyboardDismissMode'
    | 'keyboardShouldPersistTaps'
  > & {
    header?: ReactNode;
    endContent?: ReactNode;
    startContent?: ReactNode;
    paddingBottom?: SizeClassValue<SpacingStep>;
    accessibilityRole?: 'list' | 'radiogroup';
    accessibilityLabel?: string;
    fit?: boolean;
    padding?: SizeClassValue<SpacingStep>;
    paddingTop?: SizeClassValue<SpacingStep>;
    getSelectionId?: (item: Item) => string | undefined;
    getSectionKey?: (item: Item) => string | undefined;
  };

// Kit-only: native selection, controlled section expansion, a phone's long press on the header and the loading header.
export type ListSectionProps = KitProps<'List.Section'> &
  ListSelection & {
    count?: number;
    tone?: 'danger';
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    onLongPress?: () => void;
    isLoading?: boolean;
  };
