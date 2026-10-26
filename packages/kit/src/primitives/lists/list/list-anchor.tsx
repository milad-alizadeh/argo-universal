import type { LegendListRef } from '@legendapp/list/react-native';
import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { View } from 'react-native';
import { useReducedMotionNow } from '#kit/use-reduced-motion-now';
import {
  JumpToLatestButton,
  useNewestKeyWhenLeftEnd,
} from './list-jump-to-latest';
import { newestKey } from './list-newest-key';
import type { ListProps } from './list-props';
import { assignListRef } from './list-shelf-controls';

type ListRef = RefObject<LegendListRef | null>;

interface AnchoredList<Item> {
  props: ListProps<Item>;
  list: ListRef;
  newest: string;
  mounts: number;
}

interface JumpProps {
  list: ListRef;
  newest: string;
}

interface AnchorRef {
  list: ListRef;
  ref: (value: LegendListRef | null) => void;
  mounts: number;
}

const followEnd = {
  on: {
    dataChange: true,
    layout: true,
    itemLayout: true,
    footerLayout: true,
  },
} as const;

// Counts each Legend List it is handed: a List with no rows draws none, so Jump to latest listens again once one mounts.
function useAnchorRef(forwarded: ListProps<never>['ref']): AnchorRef {
  const list = useRef<LegendListRef>(null);
  const [mounts, setMounts] = useState(0);

  const ref = useCallback(
    (value: LegendListRef | null) => {
      list.current = value;
      assignListRef(forwarded, value);

      if (value) setMounts((count) => count + 1);
    },
    [forwarded],
  );

  return { list, ref, mounts };
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
  const { list, ref, mounts } = useAnchorRef(props.ref);

  const anchored =
    props.anchor === 'end'
      ? {
          ...props,
          ...anchoredPlacement(props),
          ...anchoredFollowing(props),
          ref,
        }
      : props;

  return { props: anchored, list, newest: newestKey(props), mounts };
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
