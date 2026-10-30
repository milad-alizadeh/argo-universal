import type { LegendListRef } from '@legendapp/list/react-native';
import type * as React from 'react';
import { type RefObject, useEffect, useEffectEvent, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { LiquidGlass } from '#primitives/content/liquid-glass';

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
  'size-8 items-center justify-center rounded-full border border-border active:opacity-70';

// The shared floating material, as the Composer's status Pills draw it: system glass where supported, the shared readable fallback elsewhere and under Reduce Transparency. It inherits a parent that already owns the material instead of nesting another effect.
const jumpToLatestSurface = {
  corners: 'pill',
  interactive: true,
  inherit: true,
  className: 'size-8',
} as const;

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
    <LiquidGlass {...jumpToLatestSurface}>
      <Pressable {...jumpButtonProps(props)} className={jumpToLatestClassName}>
        <Icon name="arrow-down" tone="neutral" />
        {props.hasNewRows && newRowsDot}
      </Pressable>
    </LiquidGlass>
  );
}

function jumpButtonProps(
  props: JumpToLatestButtonProps,
): React.ComponentProps<typeof Pressable> {
  return {
    role: 'button',
    hitSlop: 6,
    accessibilityLabel: jumpToLatestLabel(props.hasNewRows),
    onPress: props.onPress,
  };
}
