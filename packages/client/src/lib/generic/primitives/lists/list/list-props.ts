import type { StackGap } from '@repo/contracts/kit-tokens';
import type { ReactNode } from 'react';
import type { ListAppearance, ListSelection } from '../../../list-context';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import type { SizeClassValue } from '../../../use-size-class/size-class-value';

export type ListProps<Item> = Pick<
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
  | 'depth'
  | 'inset'
  | 'initialScrollIndex'
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
  paddingBottom?: SizeClassValue<StackGap>;
  accessibilityRole?: 'list' | 'radiogroup';
  accessibilityLabel?: string;
  fit?: boolean;
  appearance?: ListAppearance;
  padding?: SizeClassValue<StackGap>;
  paddingTop?: SizeClassValue<StackGap>;
  items?: readonly Item[];
  renderItem?: (item: Item, index: number) => ReactNode;
  getSectionKey?: (item: Item) => string | undefined;
  isLoading?: boolean;
  empty?: ReactNode;
  children?: ReactNode;
};

export interface ListSectionProps extends ListSelection {
  title?: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  footer?: string;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  children?: ReactNode;
}
