import type { ComponentProps, ReactElement, ReactNode, RefObject } from 'react';
import { View, type ViewInstance } from 'react-native';
import { cn } from '#kit/utils';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import type { InspectorBodyProps } from './inspector-pane';
import { useInspectorScroll } from './use-inspector-scroll';

export function InspectorScroll({
  scrollState,
  children,
  ...props
}: InspectorBodyProps): ReactElement {
  const { contentRef, onContentLayout, ...tracking } =
    useInspectorScroll(scrollState);

  return (
    <ScrollFadeView {...scrollProps(props)} {...tracking}>
      {measuredContent(children, contentRef, onContentLayout)}
    </ScrollFadeView>
  );
}

// A layout-only View can be flattened on native; measurement needs this host node to exist.
function measuredContent(
  children: ReactNode,
  ref: RefObject<ViewInstance | null>,
  onLayout: ComponentProps<typeof View>['onLayout'],
): ReactElement {
  return (
    <View ref={ref} collapsable={false} className="grow" onLayout={onLayout}>
      {children}
    </View>
  );
}

const scrollProps = ({
  surface,
  fitContent,
}: InspectorBodyProps): ComponentProps<typeof ScrollFadeView> => ({
  testID: 'desktop-inspector-scroll',
  className: cn('overflow-hidden', fitContent && 'min-h-0 shrink'),
  contentContainerClassName: 'grow',
  fitContent,
  surfaceClassName: surface,
});
