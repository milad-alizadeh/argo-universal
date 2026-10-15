import type * as React from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ScrollFadeFrame } from './scroll-fade-frame-view';
import type { ScrollFadeOptions } from './scroll-fade-options';
import { useScrollFade } from './scroll-fade-props';

export type ScrollFadeViewProps = ScrollViewProps &
  ScrollFadeOptions & {
    // Grows with its content up to the max height in `className`, then scrolls; otherwise it fills its parent.
    fitContent?: boolean;
  };

interface Sizing {
  frame: string;
  scroll: { className: string };
}

const sizing = (
  fitContent: boolean | undefined,
  className: string | undefined,
): Sizing => ({
  frame: cn('min-h-0', !fitContent && 'flex-1', className),
  scroll: { className: fitContent ? 'grow-0' : 'flex-1' },
});

// A scroll view whose content fades under each edge that hides more of it.
export function ScrollFadeView({
  className,
  fitContent,
  ...props
}: ScrollFadeViewProps): React.JSX.Element {
  const { frame, scroll, attachScrollView } = useScrollFade(props);
  const classNames = sizing(fitContent, className);

  return (
    <ScrollFadeFrame {...frame} className={classNames.frame}>
      <ScrollView {...scroll} {...classNames.scroll} ref={attachScrollView} />
    </ScrollFadeFrame>
  );
}
