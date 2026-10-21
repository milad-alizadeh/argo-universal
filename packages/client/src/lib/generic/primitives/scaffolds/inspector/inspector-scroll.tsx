import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
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
      <View ref={contentRef} className="grow" onLayout={onContentLayout}>
        {children}
      </View>
    </ScrollFadeView>
  );
}

const scrollProps = ({
  surface,
  fitContent,
}: InspectorBodyProps): React.ComponentProps<typeof ScrollFadeView> => ({
  testID: 'desktop-inspector-scroll',
  className: cn('overflow-hidden', fitContent && 'min-h-0 shrink'),
  contentContainerClassName: 'grow',
  fitContent,
  surfaceClassName: surface,
});
