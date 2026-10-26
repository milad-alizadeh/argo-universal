import type { LegendListRef } from '@legendapp/list/react-native';
import {
  isValidElement,
  useCallback,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { View } from 'react-native';
import { useReducedMotionNow } from '#kit/use-reduced-motion-now';
import { flattenedChildren } from '../../../flattened-children';
import {
  JumpToLatestButton,
  useNewestKeyWhenLeftEnd,
} from './list-jump-to-latest';
import type { ListProps } from './list-props';
import { ListSection } from './list-section';
import { assignListRef } from './list-shelf-controls';

type ListRef = RefObject<LegendListRef | null>;

interface AnchoredList<Item> {
  props: ListProps<Item>;
  list: ListRef;
  newest: string;
}

interface JumpProps {
  list: ListRef;
  newest: string;
}

interface AnchorRef {
  list: ListRef;
  ref: (value: LegendListRef | null) => void;
}

const followEnd = {
  on: {
    dataChange: true,
    layout: true,
    itemLayout: true,
    footerLayout: true,
  },
} as const;

let warnedAboutKeys = false;

function warnObjectItemsNeedKeys(): void {
  if (!__DEV__ || warnedAboutKeys) return;
  warnedAboutKeys = true;
  console.error(
    'List anchor="end" needs keyExtractor for object items: without one, new rows are told apart by position.',
  );
}

// An item with no keyExtractor is its own key when it is a string or number; an object has none, so its place stands in.
function unkeyedKey<Item>(item: Item, index: number): string {
  if (typeof item !== 'object' || item === null) return String(item);
  warnObjectItemsNeedKeys();

  return String(index);
}

function dataNewestKey<Item>(
  props: ListProps<Item>,
  items: readonly Item[],
): string {
  const index = items.length - 1;
  const item = items[index];

  if (item === undefined) return '';

  return props.keyExtractor
    ? props.keyExtractor(item, index)
    : unkeyedKey(item, index);
}

function newestKey<Item>(props: ListProps<Item>): string {
  if (props.items !== undefined) return dataNewestKey(props, props.items);

  return childNewestKey(props.children);
}

const textKey = (content: ReactNode): string =>
  typeof content === 'object' ? '' : String(content);

function childNewestKey(content: ReactNode): string {
  const last = flattenedChildren(content).at(-1);

  if (!isValidElement<{ children?: ReactNode; id?: string }>(last))
    return textKey(last);

  if (last.type === ListSection) return childNewestKey(last.props.children);

  return lastChildKey(last);
}

// Flattened children always carry a key, from Children.toArray.
function lastChildKey(
  last: React.ReactElement<{ id?: string; children?: ReactNode }>,
): string {
  return last.props.id ?? String(last.key);
}

function useAnchorRef(forwarded: ListProps<never>['ref']): AnchorRef {
  const list = useRef<LegendListRef>(null);

  const ref = useCallback(
    (value: LegendListRef | null) => {
      list.current = value;
      assignListRef(forwarded, value);
    },
    [forwarded],
  );

  return { list, ref };
}

// A caller's own scroll props win over the anchor's: it pins and follows the end only where the caller left those props unset.
function anchoredPlacement<Item>(
  props: ListProps<Item>,
): Pick<ListProps<Item>, 'initialScrollAtEnd' | 'alignItemsAtEnd'> {
  return {
    initialScrollAtEnd: props.initialScrollAtEnd ?? true,
    alignItemsAtEnd: props.alignItemsAtEnd ?? true,
  };
}

function anchoredFollowing<Item>(
  props: ListProps<Item>,
): Pick<
  ListProps<Item>,
  'maintainVisibleContentPosition' | 'maintainScrollAtEnd'
> {
  return {
    maintainVisibleContentPosition:
      props.maintainVisibleContentPosition ?? true,
    maintainScrollAtEnd: props.maintainScrollAtEnd ?? followEnd,
  };
}

export function useListAnchor<Item>(
  props: ListProps<Item>,
): AnchoredList<Item> {
  const { list, ref } = useAnchorRef(props.ref);

  const anchored =
    props.anchor === 'end'
      ? {
          ...props,
          ...anchoredPlacement(props),
          ...anchoredFollowing(props),
          ref,
        }
      : props;

  return { props: anchored, list, newest: newestKey(props) };
}

function JumpButton(
  props: JumpProps & { leftEndAt: string; reduced: boolean },
): ReactNode {
  return (
    <View className="pointer-events-box-none absolute inset-x-0 bottom-7 items-center">
      <JumpToLatestButton
        hasNewRows={props.leftEndAt !== props.newest}
        onPress={() =>
          void props.list.current?.scrollToEnd({ animated: !props.reduced })
        }
      />
    </View>
  );
}

export function ListJump(props: JumpProps): ReactNode {
  const leftEndAt = useNewestKeyWhenLeftEnd(props.list, props.newest);
  const reduced = useReducedMotionNow();

  return leftEndAt === null ? null : (
    <JumpButton {...props} leftEndAt={leftEndAt} reduced={reduced} />
  );
}
