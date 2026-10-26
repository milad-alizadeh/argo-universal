import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Platform } from 'react-native';
import { useScrollEndGap } from '#kit/scroll-surface';
import { Icon } from '#primitives/content/icon';
import { ListFooter } from '../../../list-footer';
import { listTestIdProps } from '../../../list-test-id';
import type { ScrollFadeListProps } from '../../../scroll-fade/scroll-fade-list-props';
import { ListHeader } from './list-header';
import type { ListProps } from './list-props';

function scrollEvents<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    onScroll: props.onScroll,
    refreshControl: props.refreshControl,
    onEndReached: props.onEndReached,
    onEndReachedThreshold: props.onEndReachedThreshold,
    contentInsetAdjustmentBehavior:
      props.contentInsetAdjustmentBehavior ?? 'automatic',
    estimatedItemSize: props.estimatedItemSize,
    keyExtractor: props.keyExtractor,
    getItemType: props.getItemType,
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
  return {
    edges: props.edges ?? nativeEdges,
    ref: props.ref,
    maxHeight: props.maxHeight,
  };
}

function streamProps<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    initialScrollIndex: props.initialScrollIndex,
    initialScrollAtEnd: props.initialScrollAtEnd,
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
    stickyHeaderIndices: props.stickyHeaderIndices,
    ListHeaderComponent: listStart(props),
    ListFooterComponent: <ListEnd {...props} />,
  };
}

export function scrollProps<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    ...scrollEvents(props),
    ...streamProps(props),
    ...listContents(props),
    extraData: props.extraData,
    recycleItems: props.recycleItems ?? false,

    ...accessibilityProps(props),
    ...testProps(props.testID),
    ...scrollBounds(props),
  };
}

function accessibilityProps<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  if (Platform.OS === 'web')
    return {
      role: props.accessibilityRole,
      'aria-label': props.accessibilityLabel,
    };

  return {
    accessibilityRole: props.accessibilityRole,
    accessibilityLabel: props.accessibilityLabel,
  };
}

// The clear space the sheet around the list asks for, drawn after its last row rather than under it.
function ScrollEndGap(): ReactElement | null {
  const gap = useScrollEndGap();

  if (gap <= 0) return null;

  return <View style={{ height: gap }} />;
}

// ListFooter takes its section's inset; only Android's info icon needs one of its own.
function ScreenFooter({ text }: { text?: string }): ReactNode {
  if (!text) return null;

  return (
    <View className="flex-row items-center android:px-4">
      {Platform.OS === 'android' ? <Icon name="info" /> : null}
      <ListFooter text={text} />
    </View>
  );
}

export function ListEnd(
  props: Pick<ListProps<never>, 'endContent' | 'footer'>,
): ReactElement {
  return (
    <>
      {props.endContent}
      <ScreenFooter text={props.footer} />
      <ScrollEndGap />
    </>
  );
}

const nativeEdges =
  Platform.OS === 'ios'
    ? ({ top: 'never', bottom: 'never' } as const)
    : undefined;

const listHeader = <Item,>(props: ListProps<Item>): ReactElement | undefined =>
  props.header == null ? undefined : <ListHeader list={props} />;

function listStart<Item>(props: ListProps<Item>): ReactElement | undefined {
  return props.startContent ? (
    <>
      {props.startContent}
      {listHeader(props)}
    </>
  ) : (
    listHeader(props)
  );
}
