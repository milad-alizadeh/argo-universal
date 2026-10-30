import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useScrollEndGap } from '#kit/scroll-surface';
import { Icon } from '#primitives/content/icon';
import { ListFooter } from '../../../list-footer';
import type { ListLook } from '../../../list-look';
import { useListLook } from '../../../list-look-context';
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
  look: ListLook,
): Partial<ScrollFadeListProps<Item>> {
  return {
    edges: props.edges ?? (look.edgeFades ? undefined : noEdgeFades),
    ref: props.ref,
    maxHeight: props.maxHeight,
  };
}

function streamProps<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    ...anchorProps(props),
    onStartReached: props.onStartReached,
    onStartReachedThreshold: props.onStartReachedThreshold,
    drawDistance: props.drawDistance,
  };
}

// Where the list opens and which end it holds as its rows change.
function anchorProps<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  return {
    initialScrollIndex: props.initialScrollIndex,
    initialScrollAtEnd: props.initialScrollAtEnd,
    alignItemsAtEnd: props.alignItemsAtEnd,
    anchoredEndSpace: props.anchoredEndSpace,
    maintainScrollAtEnd: props.maintainScrollAtEnd,
    maintainScrollAtEndThreshold: props.maintainScrollAtEndThreshold,
    maintainVisibleContentPosition: props.maintainVisibleContentPosition,
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

// What a List hands its scroll view, by its props and its List look.
export function useScrollProps<Item>(
  props: ListProps<Item>,
): Partial<ScrollFadeListProps<Item>> {
  const look = useListLook();

  return {
    ...scrollEvents(props),
    ...streamProps(props),
    ...listContents(props),
    extraData: props.extraData,
    recycleItems: props.recycleItems ?? false,

    ...accessibilityProps(props, look),
    ...testProps(props.testID),
    ...scrollBounds(props, look),
  };
}

function accessibilityProps<Item>(
  props: ListProps<Item>,
  { domRows }: ListLook,
): Partial<ScrollFadeListProps<Item>> {
  if (domRows)
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
  const { footerIcon } = useListLook();

  if (!text) return null;

  return (
    <View className="flex-row items-center android:px-4">
      {footerIcon ? <Icon name="info" /> : null}
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

const noEdgeFades = { top: 'never', bottom: 'never' } as const;

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
