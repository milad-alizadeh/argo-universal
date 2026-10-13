import type * as React from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import {
  ScrollColumnContext,
  useScrollColumnStyle,
} from '#lib/generic/scroll-column';
import { cn } from '#lib/generic/utils';
import {
  type ScrollFadeEdgeHandlers,
  useScrollFadeEdges,
} from './scroll-fade-edges';
import { ScrollFadeFrame } from './scroll-fade-frame';

export { useScrollFadeEdges } from './scroll-fade-edges';

export interface ScrollFadeViewProps extends ScrollViewProps {
  // The surface colour the content fades into, as for ScrollFadeFrame.
  surfaceClassName?: string;
}

// A scroll view whose content fades under the header above it and the edge below it.
export function ScrollFadeView(
  viewProps: ScrollFadeViewProps,
): React.JSX.Element {
  const { surfaceClassName, className, ...props } = viewProps;
  const fade = useScrollFadeEdges({ onScroll: props.onScroll });
  return (
    <ScrollFadeFrame
      edges={fade.edges}
      surfaceClassName={surfaceClassName}
      className={cn('min-h-0 flex-1', className)}
    >
      <FadingScrollView {...props} fade={fade} />
    </ScrollFadeFrame>
  );
}

interface FadingScrollViewProps extends ScrollViewProps {
  fade: ScrollFadeEdgeHandlers;
}

// It takes the pane's column for its content, then clears it for everything inside.
function FadingScrollView({
  fade,
  ...props
}: FadingScrollViewProps): React.JSX.Element {
  const fading = useFadingScrollProps(fade, props);
  return (
    <ScrollColumnContext value={undefined}>
      <ScrollView scrollEventThrottle={16} {...props} {...fading} />
    </ScrollColumnContext>
  );
}

function callFadeThenOwn<Args extends unknown[]>(
  fades: (...args: Args) => void,
  own: ((...args: Args) => void) | undefined,
): (...args: Args) => void {
  return (...args) => {
    fades(...args);
    own?.(...args);
  };
}

function useFadingScrollProps(
  fade: ScrollFadeEdgeHandlers,
  props: ScrollViewProps,
): ScrollViewProps {
  return {
    className: 'flex-1',
    contentContainerStyle: useScrollColumnStyle(props.contentContainerStyle),
    onScroll: fade.onScroll,
    onContentSizeChange: callFadeThenOwn(
      fade.onContentSizeChange,
      props.onContentSizeChange,
    ),
    onLayout: callFadeThenOwn(fade.onLayout, props.onLayout),
  };
}
