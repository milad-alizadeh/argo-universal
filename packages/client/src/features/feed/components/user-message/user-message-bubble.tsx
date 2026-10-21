import { useSyncLayout } from '@legendapp/list/react-native';
import {
  Markdown,
  type MarkdownProps,
} from '@repo/kit/primitives/content/markdown';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

const clampedLines = 4;

// "Show more" lands a layout after the bubble, which Legend List on the web misses until it next measures every row, so the Feed tells it.
function useSyncLayoutWhenClampChanges(clamped: boolean): void {
  const syncLayout = useSyncLayout();
  const syncedClamped = useRef<boolean | null>(null);
  useLayoutEffect(() => {
    if (syncedClamped.current === clamped) return;
    syncedClamped.current = clamped;
    syncLayout();
  }, [clamped, syncLayout]);
}

function ShowMore({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Pressable role="button" onPress={onPress}>
      <Text role="body" className="font-sans text-muted-foreground">
        Show more
      </Text>
    </Pressable>
  );
}

/*
 * A bubble stops growing at a readable measure rather than at a share of the column, so a wide Feed
 * does not stretch every prompt to the same block. A phone keeps the share, which is what leaves the
 * gutter that tells your message from the Agent's.
 */
const bubbleClassName =
  'max-w-7/10 wide:max-w-lg gap-0.5 rounded-2xl bg-foreground/4 dark:bg-foreground/8 px-3.5 py-2.5 wide:px-3 wide:py-2';

interface BubbleProps {
  text: string;
}

export function UserMessageBubble({ text }: BubbleProps): React.JSX.Element {
  const { clamped, expand, markdown } = useBubbleExpansion();

  return (
    <View className={bubbleClassName}>
      <Markdown text={text} {...markdown} />
      {clamped && <ShowMore onPress={expand} />}
    </View>
  );
}

interface BubbleExpansion {
  clamped: boolean;
  expand: () => void;
  markdown: Pick<MarkdownProps, 'numberOfLines' | 'onOverflowChange'>;
}

function useBubbleExpansion(): BubbleExpansion {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const clamped = !expanded && overflowing;
  useSyncLayoutWhenClampChanges(clamped);

  return {
    clamped,
    expand: () => setExpanded(true),
    markdown: {
      numberOfLines: expanded ? undefined : clampedLines,
      onOverflowChange: setOverflowing,
    },
  };
}
