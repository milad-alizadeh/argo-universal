import type * as React from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ScrollFadeFrame } from './scroll-fade-frame-view';
import type { ScrollFadeOptions } from './scroll-fade-options';
import { useScrollFade } from './scroll-fade-props';

export type ScrollFadeViewProps = ScrollViewProps &
  ScrollFadeOptions & {
    // Grows with its content up to the max height in `className`, then scrolls; otherwise it fills its parent. A horizontal one always fits its content's height.
    fitContent?: boolean;
  };

interface Sizing {
  frame: string;
  scroll: Pick<ScrollViewProps, 'contentInsetAdjustmentBehavior'> & {
    className: string;
  };
}

/*
 * A horizontal row is as tall as its content and narrows to its parent, scrolling what does not fit. It never takes
 * iOS's header inset: under a clear header that would push its content out of view, and keep it there.
 */
const horizontalSizing = (className: string | undefined): Sizing => ({
  frame: cn('min-w-0', className),
  scroll: { className: 'grow-0', contentInsetAdjustmentBehavior: 'never' },
});

const verticalSizing = (
  fitContent: boolean | undefined,
  className: string | undefined,
): Sizing => ({
  frame: cn('min-h-0', !fitContent && 'flex-1', className),
  scroll: { className: fitContent ? 'grow-0' : 'flex-1' },
});

type SizingProps = Pick<
  ScrollFadeViewProps,
  'fitContent' | 'horizontal' | 'className'
>;

const sizing = ({ fitContent, horizontal, className }: SizingProps): Sizing =>
  horizontal
    ? horizontalSizing(className)
    : verticalSizing(fitContent, className);

// A scroll view whose content fades under each edge that hides more of it: top and bottom, or leading and trailing when `horizontal`.
export function ScrollFadeView({
  className,
  fitContent,
  ...props
}: ScrollFadeViewProps): React.JSX.Element {
  const { frame, scroll, attachScrollView } = useScrollFade(props);
  const classNames = sizing({ ...props, fitContent, className });

  return (
    <ScrollFadeFrame {...frame} className={classNames.frame}>
      <ScrollView {...scroll} {...classNames.scroll} ref={attachScrollView} />
    </ScrollFadeFrame>
  );
}
