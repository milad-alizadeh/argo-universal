import type { LegendListRef } from '@legendapp/list/react-native';
import { Icon } from '@repo/kit/primitives/content/icon';
import type * as React from 'react';
import { type RefObject, useEffect, useEffectEvent, useState } from 'react';
import { Pressable, View } from 'react-native';

type ListRef = RefObject<LegendListRef | null>;

const listenAtEnd = (
  list: ListRef,
  onAtEndChange: (atEnd: boolean) => void,
): (() => void) | undefined =>
  list.current
    ?.getState()
    .listen('isWithinMaintainScrollAtEndThreshold', onAtEndChange);

// The newest row's key when the reader left the end of a list that follows its end, as the Feed and a Shell's output do; null while they are at the end.
export function useNewestKeyWhenLeftEnd(
  list: ListRef,
  newestKey: string,
): string | null {
  const [leftEndAt, setLeftEndAt] = useState<string | null>(null);

  const onAtEndChange = useEffectEvent((atEnd: boolean) =>
    setLeftEndAt(atEnd ? null : newestKey),
  );

  useEffect(() => listenAtEnd(list, onAtEndChange), [list]);

  return leftEndAt;
}

const jumpToLatestClassName =
  'size-8 items-center justify-center rounded-full border border-border bg-card shadow-raised active:opacity-70';

const newRowsDot = (
  <View className="absolute -top-px -right-px size-2.25 rounded-full border-2 border-card bg-info" />
);

export interface JumpToLatestButtonProps {
  hasNewRows: boolean;
  onPress: () => void;
}

const jumpToLatestLabel = (hasNewRows: boolean): string =>
  hasNewRows ? 'Jump to latest, new rows' : 'Jump to latest';

// Takes the reader back to the end of a list they scrolled up in; the dot marks rows that arrived since.
export function JumpToLatestButton(
  props: JumpToLatestButtonProps,
): React.JSX.Element {
  return (
    <Pressable
      role="button"
      accessibilityLabel={jumpToLatestLabel(props.hasNewRows)}
      onPress={props.onPress}
      className={jumpToLatestClassName}
    >
      <Icon name="arrow-down" role="control" tone="neutral" />
      {props.hasNewRows && newRowsDot}
    </Pressable>
  );
}
