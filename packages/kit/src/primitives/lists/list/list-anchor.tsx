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
import { itemIdentity } from './list-item-identity';
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

const anchorOptions = {
  initialScrollAtEnd: true,
  alignItemsAtEnd: true,
  maintainVisibleContentPosition: true,
  maintainScrollAtEnd: {
    on: {
      dataChange: true,
      layout: true,
      itemLayout: true,
      footerLayout: true,
    },
  },
} as const;

function dataNewestKey<Item>(
  props: ListProps<Item>,
  items: readonly Item[],
): string {
  const index = items.length - 1;
  const item = items[index];

  if (item === undefined) return '';

  if (!props.keyExtractor) return itemIdentity(item);

  return props.keyExtractor(item, index);
}

function newestKey<Item>(props: ListProps<Item>): string {
  if (props.items !== undefined) return dataNewestKey(props, props.items);

  return childNewestKey(props.children);
}

function childNewestKey(content: ReactNode): string {
  const last = flattenedChildren(content).at(-1);

  if (!isValidElement<{ children?: ReactNode; id?: string }>(last))
    return itemIdentity(last);

  if (last.type === ListSection) return childNewestKey(last.props.children);

  return childIdentity(last);
}

function childIdentity(
  last: React.ReactElement<{ id?: string; children?: ReactNode }>,
): string {
  if (last.props.id !== undefined) return last.props.id;

  return last.key === null
    ? itemIdentity(last.props.children)
    : String(last.key);
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

export function useListAnchor<Item>(
  props: ListProps<Item>,
): AnchoredList<Item> {
  const { list, ref } = useAnchorRef(props.ref);

  const anchored =
    props.anchor === 'end' ? { ...props, ...anchorOptions, ref } : props;

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
