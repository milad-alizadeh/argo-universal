import { useSyncLayout } from '@legendapp/list/react-native';
import type * as React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { FeedMarkdown } from '#lib/product/markdown/feed-markdown';
import { Text } from '#primitives/content/text';
import { ClampLeaves } from '../../../../lib/product/markdown/clamp-leaves';
import {
  useWholeLineClamp,
  type WholeLineClamp,
} from '../../../../lib/product/markdown/use-whole-line-clamp';
import { wholeLineClip } from '../../../../lib/product/markdown/whole-line-clip';

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

const clipStyle = ({
  clamped,
  clipHeight,
}: ClampedMarkdownProps): ViewStyle | undefined =>
  clamped && clipHeight !== undefined ? wholeLineClip(clipHeight) : undefined;

function ClampedMarkdown(props: ClampedMarkdownProps): React.JSX.Element {
  const { content, onContentLayout, registerLeaf } = props;

  return (
    <View style={clipStyle(props)}>
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
  'max-w-7/10 gap-0.5 rounded-2xl bg-tint px-3.5 py-2.5 wide:px-3 wide:py-2';

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
