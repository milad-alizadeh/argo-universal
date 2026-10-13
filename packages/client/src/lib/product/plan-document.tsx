import type * as React from 'react';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { FeedMarkdown } from './markdown/feed-markdown';
import { ScrollFade } from './scroll-fade/scroll-fade-overlay';
const flexibleContentClassName = 'flex-1 min-h-0';

export function PlanDocument({
  content,
  layout,
}: {
  content: string;
  layout: 'proposal' | 'expanded' | 'tray' | 'sheet' | 'request-sheet';
}): React.JSX.Element {
  const expanded = layout === 'expanded';
  const written = layout === 'tray' || layout === 'sheet';
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [offset, setOffset] = useState(0);
  const overflow = contentHeight > viewportHeight + 1;
  const thumbHeight =
    (viewportHeight * viewportHeight) / Math.max(1, contentHeight);
  const markdown = <FeedMarkdown text={content} variant="proposal" />;
  if (layout === 'request-sheet' || layout === 'sheet')
    return layout === 'sheet' ? (
      <View className="pt-2 pb-4">{markdown}</View>
    ) : (
      markdown
    );
  return (
    <View
      className={cn(
        'relative overflow-hidden',
        expanded
          ? cn(flexibleContentClassName, 'bg-card rounded-xl shadow-xs')
          : cn(
              'max-h-plan-proposal',
              !written && 'bg-card rounded-xl shadow-xs',
            ),
      )}
    >
      <ScrollView
        testID={written ? undefined : 'plan-proposal-scroll'}
        role="region"
        accessibilityLabel={
          written ? 'Written plan document' : 'Plan proposal document'
        }
        className={
          expanded ? flexibleContentClassName : 'max-h-plan-proposal grow-0'
        }
        contentContainerClassName={
          expanded || written ? 'px-4 pt-2 pb-4' : 'px-3.5 py-3'
        }
        showsVerticalScrollIndicator={false}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        onLayout={({ nativeEvent }) =>
          setViewportHeight(nativeEvent.layout.height)
        }
        onScroll={({ nativeEvent }) => setOffset(nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {markdown}
      </ScrollView>
      {!expanded &&
        !written &&
        overflow &&
        contentHeight - viewportHeight - offset > 1 && (
          <ScrollFade edge="bottom" className="bg-card" height={40} />
        )}
      {overflow && (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          aria-hidden
          className="absolute right-1 w-1 rounded-full bg-foreground/20"
          style={{
            height: thumbHeight,
            top:
              (offset * (viewportHeight - thumbHeight)) /
              (contentHeight - viewportHeight),
          }}
        />
      )}
    </View>
  );
}
