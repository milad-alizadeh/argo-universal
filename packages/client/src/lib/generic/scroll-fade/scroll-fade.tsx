import type * as React from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ScrollFadeFrame } from './scroll-fade-frame-view';
import type { ScrollFadeOptions } from './scroll-fade-options';
import { useScrollFade } from './scroll-fade-props';

export type ScrollFadeViewProps = ScrollViewProps & ScrollFadeOptions;

// A scroll view whose content fades under each edge that hides more of it.
export function ScrollFadeView({
  className,
  ...props
}: ScrollFadeViewProps): React.JSX.Element {
  const { frame, scroll, attachScrollView } = useScrollFade(props);
  const frameClassName = cn('min-h-0 flex-1', className);

  return (
    <ScrollFadeFrame {...frame} className={frameClassName}>
      <ScrollView {...scroll} ref={attachScrollView} className="flex-1" />
    </ScrollFadeFrame>
  );
}
