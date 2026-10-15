import { useSyncLayout } from '@legendapp/list/react-native';
import type * as React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';
import { FeedMarkdown } from '#lib/product/markdown/feed-markdown';
import { Text } from '#primitives/display/text';
import { ClampLeaves } from '../../../../lib/product/markdown/clamp-leaves';
import {
  useWholeLineClamp,
  type WholeLineClamp,
} from '../../../../lib/product/markdown/use-whole-line-clamp';

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

interface ClampedMarkdownProps extends WholeLineClamp {
  text: string;
  clamped: boolean;
}

// Native clips as a scroll container, so Yoga lays the content out at its full height beneath the maxHeight. With overflow hidden, Yoga fits the text into the maxHeight and iOS draws part-cut lines; the web clips either way.
const clipOverflow: ViewStyle['overflow'] =
  Platform.OS === 'web' ? 'hidden' : 'scroll';

const clipStyle = ({ clamped, clipHeight }: ClampedMarkdownProps): ViewStyle =>
  clamped ? { overflow: clipOverflow, maxHeight: clipHeight } : {};

function ClampedMarkdown(props: ClampedMarkdownProps): React.JSX.Element {
  const { content, onContentLayout, registerLeaf } = props;

  return (
    <View className="overflow-hidden" style={clipStyle(props)}>
      <View ref={content} onLayout={onContentLayout}>
        <ClampLeaves.Provider value={registerLeaf}>
          <FeedMarkdown text={props.text} />
        </ClampLeaves.Provider>
      </View>
    </View>
  );
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

const bubbleClassName =
  'max-w-[70%] gap-0.5 rounded-2xl bg-muted px-3.5 py-2.5 wide:px-3 wide:py-2';

interface BubbleProps {
  text: string;
}

export function UserMessageBubble({ text }: BubbleProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const clamp = useWholeLineClamp(clampedLines);
  const clamped = !expanded && clamp.clipHeight !== undefined;
  useSyncLayoutWhenClampChanges(clamped);

  return (
    <View className={bubbleClassName}>
      <ClampedMarkdown text={text} clamped={clamped} {...clamp} />
      {clamped && <ShowMore onPress={() => setExpanded(true)} />}
    </View>
  );
}
