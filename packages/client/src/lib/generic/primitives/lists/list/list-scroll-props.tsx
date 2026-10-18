import type { ReactElement, ReactNode } from 'react';
import { listTestIdProps } from '../../../list-test-id';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import type { ListProps } from './list-props';

function scrollEvents<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    onScroll: props.onScroll,
    onEndReached: props.onEndReached,
    onEndReachedThreshold: props.onEndReachedThreshold,
    contentInsetAdjustmentBehavior: props.contentInsetAdjustmentBehavior,
    estimatedItemSize: props.estimatedItemSize,
  };
}

function testProps(
  testID?: string,
): ReturnType<typeof listTestIdProps> | Record<never, never> {
  return testID ? listTestIdProps(testID) : {};
}

function scrollBounds<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return { edges: props.edges, ref: props.ref, maxHeight: props.maxHeight };
}

function streamProps<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    initialScrollIndex: props.initialScrollIndex,
    alignItemsAtEnd: props.alignItemsAtEnd,
    maintainScrollAtEnd: props.maintainScrollAtEnd,
    maintainScrollAtEndThreshold: props.maintainScrollAtEndThreshold,
    maintainVisibleContentPosition: props.maintainVisibleContentPosition,
    onStartReached: props.onStartReached,
    onStartReachedThreshold: props.onStartReachedThreshold,
    drawDistance: props.drawDistance,
  };
}

function listContents<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    inset: props.inset,
    depth: props.depth,
    keyboardDismissMode: props.keyboardDismissMode,
    keyboardShouldPersistTaps: props.keyboardShouldPersistTaps,
    ListHeaderComponent: listContent(props.header),
    ListFooterComponent: listContent(props.footer),
  };
}

export function scrollProps<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    ...scrollEvents(props),
    ...streamProps(props),
    ...listContents(props),
    keyExtractor: props.keyExtractor,
    getItemType: props.getItemType,
    extraData: props.extraData,
    recycleItems: props.recycleItems ?? false,

    ...testProps(props.testID),
    ...scrollBounds(props),
  };
}

function Content({ children }: { children: ReactNode }): ReactNode {
  return children;
}

function listContent(content: ReactNode): ReactElement | undefined {
  return content == null ? undefined : <Content>{content}</Content>;
}
